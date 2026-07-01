const mySql = require("mysql2/promise");

const SQL_CONFIGURATION_DATA = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD, 
    database: process.env.MYSQL_DB, 
    port: 3306,
    charset: 'utf8'
}

exports.realizarQuery = async function (queryString, params = [])
{
    let returnObject;
    let connection;
    try
    {
        connection = await mySql.createConnection(SQL_CONFIGURATION_DATA);
        returnObject = await connection.query(queryString, params);  // params adentro del try
    }
    catch(err)
    {
        console.log(err);
        throw err;  // importante: relanzar para que el catch del index.js lo capture
    }
    finally
    {
        if(connection && connection.end) connection.end();
    }
    return returnObject[0];  // return acá, fuera del try pero antes de cerrar
}