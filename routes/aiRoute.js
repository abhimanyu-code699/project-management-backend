const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');

const router = express.Router();


router.post("/generate-user-stories", async (req, res) => {

    dotenv.config();
    console.log("GROQ api key",process.env.GROQ_API_KEY);
  try {
    const { projectDescription } = req.body;

    if (!projectDescription) {
      return res.status(400).json({ error: "projectDescription is required" });
    }

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "mixtral-8x7b-32768", 
        messages: [
          {
            role: "system",
            content:
              "You are a project manager assistant who converts plain text into user stories.",
          },
          {
            role: "user",
            content: `Generate user stories for this project: ${projectDescription}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiOutput = response.data.choices[0].message.content;
    const userStories = aiOutput
      .split("\n")
      .filter((line) => line.trim().startsWith("As a"))
      .map((line) => line.trim());

    return res.status(200).json({ userStories });
  } catch (error) {
    console.error("❌ AI generation failed:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to generate user stories",
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;