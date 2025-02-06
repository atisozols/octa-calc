require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bodyParserXml = require('body-parser-xml');
const cors = require('cors');
const multer = require('multer');

const corsOptions = require('./config/corsOptions');
const logger = require('./middleware/logger');
const outputFormatter = require('./middleware/outputFormatter');
const auto = require('./routes/api/auto');

const app = express();

// middleware
// konfigurē bodyParser ar Xml atbalstu
bodyParserXml(bodyParser);

// papildus options objektā norādītas izmaiņas, lai parser
// neveidotu array struktūru un neglabātu root elementu
app.use(
  bodyParser.xml({
    xmlParseOptions: { explicitArray: false, explicitRoot: false },
  }),
);

app.use(express.json());
app.use(multer().none());
app.use(cors(corsOptions));
app.use(outputFormatter);
app.use(logger);

// API route
app.use('/api/auto', auto);

module.exports = app;
