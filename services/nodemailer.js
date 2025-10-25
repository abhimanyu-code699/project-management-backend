const nodemailer = require("nodemailer")
const ejs = require("ejs")
const path = require("path")

let nodeConfig = {
  service:"gmail",
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
}
const transporter = nodemailer.createTransport(nodeConfig)

function sendEmail(recipient, subject, templatePath, data) {
  ejs.renderFile(templatePath, data, (err, html) => {
    if (err) {
      console.error("Error rendering EJS template:", err)
      return res.status(500).send("Internal server error")
    }

    const mailOptions = {
      from: {
        name: "Developer",
        address: process.env.EMAIL,
      },
      to: recipient,
      subject: subject,
      html: html,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error)
        return res.status(500).send("Internal server error")
      } else {
        console.log("Email sent:", info.response)
        // Send an HTTP response if needed
        return res
          .status(200)
          .json({ success: true, message: "Email sent successfully" })
      }
    })
  })
}

module.exports = sendEmail
