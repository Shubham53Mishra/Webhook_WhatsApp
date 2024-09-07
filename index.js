const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const mongoose=require('mongoose')
require('dotenv').config();
const Message=require('./model')
const PORT = process.env.PORT || 8000;
const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;
const http = require('http');

require('dotenv').config();

const app = express();
const server = http.createServer(app);


// Middleware setup
app.use(bodyParser.json());

// Start the server
app.listen(PORT, () => {
    console.log(`Webhook is listening on port ${PORT}`);
});
// Mongooge connect

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Connected to MongoDB successfully');
}).catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
});


// Verification for the callback URL from the dashboard
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const challenge = req.query["hub.challenge"];
    const token = req.query["hub.verify_token"];

    if (mode && token) {
        if (mode === "subscribe" && token === mytoken) {
            res.status(200).send(challenge);
        } else {
            res.status(403).send("Forbidden");
        }
    } else {
        res.status(400).send("Bad Request");
    }
});

// Handle incoming webhook events
app.post("/webhook",async (req, res) => {


    const bodyParam = req.body;
    console.log(JSON.stringify(bodyParam, null, 2));
    
    if (bodyParam.object) {
        if (bodyParam.entry &&
            bodyParam.entry[0].changes &&
            bodyParam.entry[0].changes[0].value.messages &&
            bodyParam.entry[0].changes[0].value.messages[0]
        ) {
            const phoneNumberId = bodyParam.entry[0].changes[0].value.metadata.phone_number_id;
            const from = bodyParam.entry[0].changes[0].value.messages[0].from;
            const messageBody = bodyParam.entry[0].changes[0].value.messages[0].text.body;
            const sender_Number=bodyParam.entry[0].changes[0].value.contacts[0].wa_id;
            



axios({
    method: "POST",
    url: `https://graph.facebook.com/v20.0/${phoneNumberId}/messages?access_token=${token}`,
    data: {
        messaging_product: "whatsapp",
                    to: from,
                    text: {
                        body: `Hi! I'm Ridobiko. Your message is: ${messageBody}`
                    }
                },
                headers: {
                    "Content-Type": "application/json"
                }
            })
            .then(response => {
                console.log("Message sent successfully:", response.data);
                res.status(200).json({ status: "success", data: response.data });
            })
            .catch(error => {
                console.error("Error sending message:", error);
                res.status(500).json({ status: "error", message: "Failed to send messagesss" });
            });
            const status="success"
            const message="Message sent"
            try {
                // const { status, message, body, form } = req.body;
        
                const newMessage = new Message({ status, message, messageBody, sender_Number });
                await newMessage.save();
        
                // res.status(201).json({ message: 'Message stored successfully', data: newMessage });
                res.status(200).json({ status: "success", message: "message sent",  body: ` ${messageBody}` ,form:`${sender_Number}`});
            } catch (error) {
                res.status(500).json({ message: 'Failed to store message', error });
            }


            
            // res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } else {
        res.sendStatus(404);
    }
});

app.get('/messages', async (req, res) => {
    try {
        const messages = await Message.find();
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Failed to retrieve messages', error });
    }
});



app.get('/latest_messages', async (req, res) => {
    try {
        const latestEntries = await  Message.find().sort({ createdAt: -1 }).limit(10);
        res.json(latestEntries);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching entries' });
    }
});


// Basic endpoint to confirm server is running
app.get("/", (req, res) => {
    res.status(200).send("Hello, this is the webhook setup");
});
