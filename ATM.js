const readline = require('readline');
const fs = require("fs");
const EventEmitter = require('events');

let userData = require('./users.json');

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Create an instance of EventEmitter
const eventEmitter = new EventEmitter();

// Function to emit events for different ATM operations
async function emitEvents(operation, ...args) {
    eventEmitter.emit(operation, ...args);
}

// Add event listeners for different ATM operations
eventEmitter.on('checkingBalance', checkingBalance);
eventEmitter.on('depositingMoney', depositingMoney);
eventEmitter.on('withdrawingMoney', withdrawingMoney);
eventEmitter.on('transactionHistory', transactionHistory);

// Function to ask questions
const askQuestion = (question) => {
    return new Promise((resolve, reject) => {
        r1.question(question, (answer) => {
            if (answer) {
                resolve(answer)
            } else {
                reject(new Error("ERROR: you have to answer the question"));
            }
        });
    });
};

// Function to generate Account ID whenever we add a new user
function generateAccountID() {
    if (userData.length === 0) {
        return 'ACC1001';
    } else {
        const lastUser = userData[userData.length - 1];
        const lastAccountID = lastUser.accountID;
        const numericPart = parseInt(lastAccountID.substring(3));
        const newNumericPart = numericPart + 1;
        return 'ACC' + newNumericPart.toString();
    }
}

// Function to generate PIN whenever we add a new user
function generatePIN() {
    return Math.floor(1000 + Math.random() * 9000);
}

// Function to add a new user to the users array
async function addUser() {
    let accountID = generateAccountID();
    let name = await askQuestion("Enter your name:");
    let pin = generatePIN().toString();

    let newUser = {
        accountID: accountID,
        name: name,
        pin: pin,
        balance: 0,
        transactions: []
    };

    userData.push(newUser);

    fs.writeFileSync('./users.json', JSON.stringify(userData, null, 2)); // Use writeFileSync to ensure the data is written before continuing
    console.log("User added successfully.");

    r1.close();
}

// Function to return the user that we are looking for
function authenticateUser(accountID, pin) {
    const user = userData.find(user => user.accountID === accountID && user.pin === pin);
    return user !== undefined;
}

// Function to ask the user to enter accountID and pin
async function promptCredentials() {
    const accountID = await askQuestion("Enter your account ID: ");
    const pin = await askQuestion("Enter your PIN: ");
    return { accountID, pin };
}

// Function to check if the user is authenticated
async function authenticate() {
    console.log("Welcome to the authentication system.");
    try {
        const { accountID, pin } = await promptCredentials();

        const isAuthenticated = authenticateUser(accountID, pin);

        if (isAuthenticated) {
            menu(accountID, pin);
        } else {
            console.log("Authentication failed. Please check your credentials.");
            r1.close();
        }
    } catch (error) {
        console.log("Error occurred during authentication:", error.message);
        r1.close();
    }
}

// Function to check balance
function checkingBalance(accountID, pin) {
    const user = userData.find(user => user.accountID === accountID && user.pin === pin);
    if (user) {
        console.log(`Hello ${user.name}, your balance is ${user.balance}`);
    } else {
        console.log("User not found.");
    }

    menu(accountID, pin);
}

// Function for depositing money
async function depositingMoney(accountID, pin) {
    try {
        const amountString = await askQuestion("Enter the amount you want to deposit: ");
        const amount = parseInt(amountString);
        if (isNaN(amount) || amount <= 0) {
            throw new Error("Invalid amount.");
        }

        const userIndex = userData.findIndex(user => user.accountID === accountID && user.pin === pin);
        if (userIndex !== -1) {
            userData[userIndex].balance += amount;

            const transaction = {
                type: 'deposit',
                amount: amount,
                date: new Date().toISOString().split('T')[0] // Today's date
            };

            userData[userIndex].transactions.push(transaction);

            fs.writeFileSync('./users.json', JSON.stringify(userData, null, 2));

            console.log(`Deposit of $${amount} successful.`);
            console.log(`New balance: $${userData[userIndex].balance}`);
        } else {
            console.log("User not found.");
        }
    } catch (error) {
        console.log("Error occurred during deposit:", error.message);
    }

    menu(accountID, pin);
}

// Function for withdrawing money
async function withdrawingMoney(accountID, pin) {
    try {
        const amountString = await askQuestion("Enter the amount you want to withdraw: ");
        const amount = parseInt(amountString);
        if (isNaN(amount) || amount <= 0) {
            throw new Error("Invalid amount.");
        }

        const userIndex = userData.findIndex(user => user.accountID === accountID && user.pin === pin);
        if (userIndex !== -1) {
            if (userData[userIndex].balance >= amount) {
                userData[userIndex].balance -= amount;

                const transaction = {
                    type: 'withdrawal',
                    amount: amount,
                    date: new Date().toISOString().split('T')[0] // Today's date
                };

                userData[userIndex].transactions.push(transaction);

                fs.writeFileSync('./users.json', JSON.stringify(userData, null, 2));

                console.log(`Withdrawal of $${amount} successful.`);
                console.log(`New balance: $${userData[userIndex].balance}`);
            } else {
                console.log("Insufficient balance.");
            }
        } else {
            console.log("User not found.");
        }
    } catch (error) {
        console.log("Error occurred during withdrawal:", error.message);
    }

    menu(accountID, pin);
}

// Function for viewing transaction history
function transactionHistory(accountID, pin) {
    const user = userData.find(user => user.accountID === accountID && user.pin === pin);
    if (user) {
        if (user.transactions.length > 0) {
            console.log(`Transaction history for ${user.name}:`);
            user.transactions.forEach(transaction => {
                console.log(`Type: ${transaction.type}, Amount: $${transaction.amount}, Date: ${transaction.date}`);
            });
        } else {
            console.log("No transaction history available.");
        }
    } else {
        console.log("User not found.");
    }

    menu(accountID, pin);
}

// Function for the main menu
const menu = async (accountID, pin) => {
    try {
        const choice = await askQuestion("***Menu***\n 1. Checking Balance\n 2. Depositing Money\n 3. Withdrawing Money\n 4. Viewing Transaction History\n 5. Exit \n make your choice: ");

        switch (choice) {
            case "1":
                emitEvents('checkingBalance', accountID, pin);
                break;
            case "2":
                emitEvents('depositingMoney', accountID, pin);
                break;
            case "3":
                emitEvents('withdrawingMoney', accountID, pin);
                break;
            case "4":
                emitEvents('transactionHistory', accountID, pin);
                break;
            case "5":
                process.exit(0);
            default:
                console.log("Invalid choice.");
                break;
        }

    } catch (error) {
        console.log("Error occurred in the menu:", error.message);
        r1.close();
    }
};

authenticate();
// addUser();
