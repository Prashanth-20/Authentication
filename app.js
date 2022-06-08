const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//register-API

app.post("/register/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const dbUserQuery = `
        SELECT * FROM user WHERE username = '${username}';`;
  const dbUserResponse = await db.get(dbUserQuery);
  if (dbUserResponse === undefined) {
    if (password.length >= 5) {
      const createUserQuery = `
            INSERT INTO 
                    user (username, name, password, gender, location) 
            VALUES 
            (
            '${username}', 
            '${name}',
            '${hashedPassword}', 
            '${gender}',
            '${location}'
            )`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//login-API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const userLoggedQuery = `
    SELECT * FROM user WHERE username = '${username}';`;

  const logDbResponse = await db.get(userLoggedQuery);

  if (logDbResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordCheck = await bcrypt.compare(
      password,
      logDbResponse.password
    );
    if (passwordCheck === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//Change-Password-API

app.put("/change-password/", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const updatePasswordQuery = `
        SELECT * FROM user WHERE username = '${username};'`;
  const dbUpdateResponse = await db.get(updatePasswordQuery);

  if (dbUpdateResponse === undefined) {
    let isPasswordCheck = await bcrypt.compare(
      oldPassword,
      dbUpdateResponse.oldPassword
    );
    if (isPasswordCheck === false) {
      response.status(400);
      response.send("Invalid current password");
    } else {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const resetPasswordQuery = `
                UPDATE 
                    user
                SET 
                    oldPassword = '${newPassword}';`;
        await db.run(resetPasswordQuery);
        response.status(200);
        response.send("Password updated");
      }
    }
  }
});

module.exports = app;
