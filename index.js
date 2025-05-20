import Bynder from '@bynder/bynder-js-sdk';

const bynder = new Bynder({
    baseURL: "https://portal.getbynder.com/api/",
    clientId: "<your OAuth2 client id>",
    clientSecret: "<your OAuth2 client secret>",
    redirectUri: "<url where user will be redirected after authenticating>"
});
  
const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('Hello World from Express!');
});

// Example POST route
app.post('/api/data', (req, res) => {
  const data = req.body;
  res.json({ message: 'Data received', data });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
