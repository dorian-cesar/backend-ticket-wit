const nodemailer = require("nodemailer");

exports.sendEmail = async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            html: `<p>${message}</p>`
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "Correo enviado exitosamente." });
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        res.status(500).json({ error: "Error al enviar el correo." });
    }
};
