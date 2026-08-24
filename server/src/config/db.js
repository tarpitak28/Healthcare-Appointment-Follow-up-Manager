const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../../../node_modules/@prisma/client'));

const prisma = new PrismaClient();

module.exports = prisma;
