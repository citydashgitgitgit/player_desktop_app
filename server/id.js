const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const appRoot = require('app-root-path');
const axios = require("axios");
const AWS = require("aws-sdk");
require('dotenv').config();