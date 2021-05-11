let express = require("express");
let router = express.Router();

router.get("/", function (req, res, next) {
	res.send(`
	<!DOCTYPE html><html lang="en"> <head> <meta charset="UTF-8"/> <meta name="robots" content="noindex"> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <title>API Server for example 👨‍💻</title> <style>body{background: #1d1e22; color: white;}a{color: white;}.wrapper{font-family: sans-serif; padding: 80px;}</style> </head> <body> <div class="wrapper"> <img draggable="false" src="https://www.nicepng.com/png/full/246-2467547_your-logo-here-your-logo-here-logo-png.png" alt="example.com"/> <h1>👨‍💻 API Server[${process.env.NODE_ENV}] for example.com</h1> <span>You might want to visit <a target="_blank" rel="noopener noreferrer" href="https://example.com">example.com</a>. </span> </div></body></html>`);
});

module.exports = router;
