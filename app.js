require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bodyParserXml = require('body-parser-xml');
const cors = require('cors');
const multer = require('multer');

const corsOptions = require('./config/corsOptions');
const logger = require('./middleware/logger');
const auto = require('./routes/api/auto');
const payment = require('./routes/api/payment');
const errorHandler = require('./middleware/errorHandler');

const app = express();

bodyParserXml(bodyParser);
app.use(
  bodyParser.xml({
    xmlParseOptions: { explicitArray: false, explicitRoot: false },
  }),
);
app.use(express.json());
app.use(multer().none());
app.use(cors(corsOptions));
app.use(logger);

app.use('/api/auto', auto);
app.use('/api/payment', payment);

app.use(errorHandler);

module.exports = app;
