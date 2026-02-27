const { google } = require('googleapis');

const email = 'asset-crm-service@gen-lang-client-0467162090.iam.gserviceaccount.com';
const key = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDSvtyp+DeXBMQn
E6lGemY+AtI4H0IarZl6mMZ3g9l8r/LzmO+edBQmJXpLIJwZw5hkufO2jFkgw/dQ
YunARmua1dftrR8TOF/rBj6JnOyCVHvm0Z+QssRxHESnN1D8Z8gzUpbKGCAiqoep
I58KVfhKlOCX9uOv0nvXpFMmLfTES4Cx9TvQ7TZQ/pOjrscXCXXfoxJcZZHAPqoc
AzQRU4M0IlhIULogrzG7unSqqMSb3EXecJyPjveYmeUUETSOHBMk5uOPiz2JEq8M
n/KMHR8aKbbM1jnf5o7/8kebAtMvSiND01psfQg/0wZN/UYFxoTOgfo9CU/+QcKu
5+sGJzb5AgMBAAECggEALQ9DBhJ87EzIFeTVyixshPC8euRwEV0x1i0pLi+iRk8m
fqAiB7qg/kEAI2UPC1EvWcYKjmr2uZM841Kq0QIdiscTOo3L+aORmqJEp87GIN2o
ekMyv1EBwH9/TFN+/ODBxPtxIzfCUzcr92WW4TJderDXTpaquxKhiQto/d5QmdF5
MCF2r+W/bn1bcYhsiv8sKjFiUQ1q3mGTww7v/D5pipOqLhPKXZvATQp4e/TFL2j1
Wsop1dRoaDPXaihCxNPIfToZrMrYzKVlcj4bRr9pu3+X2lcqACb79NaFriA7+0wD
e6IEnI3vFxtBdnGP6/FlJHlu65jDPdQb7lqgYj0ZIwKBgQD+Uk2FRK3uuMeQ2L7C
mcBH62ele2JFmpTlqWXHQAbwKvQkDtJ9e7Gj8HpjPfpnV+hrVclkMDOFybNzD1eL
Jy0ek71Glq5CiS/r+5JW/HZ0ct9soh9RoTniCokeX5pMXS0dE8446/FxIBpAwMxW
gLMS8Fzm9zkDcxUN0T1qjroh6wKBgQDUIu8apf/E6xkPN8oBtGtCFIpps4SODsNx
QWlroHLX8sBDX+eytAYmux0JORC+EluOGWa+xX864RU0KtwCcg78Jg55y92CM9Ag
IN+dNUJ8mRIWLGBukJhERzi4K04uIaGLmOLqvP92HEDeSzXz+jtaTXfRv7suufAa
JvGMFETtqwKBgQDWzTruebCSdX0RKRANmwDdfcVf7pN1CHgEdgwhu0Fg7lagceh0
1dmXBtDIK5voV0ZWCfH8bf3GXTL01ptxS5h/P/dYvIHYbriMD0Jtt/RwrGlq/o+H
Sa5y7cUcY1EWeIhXC9hdGWMm0h96W5z63t7g+yTsaxi7giLhNb4y1vP9GwKBgQCt
jXsS0TZEc5bH5XumE2Yg5M8slQrgceGh2cMWo2jxlY+IT4EuqavSqgiiUAaLildP
FScC8m8Zy6XeTSY79faegcAcExbA/ATNFDf91OH1MAIlE9889Z0tVxtnST6n7SnO
HKGhLEjP52OGuf+FAHbodTKO7o6ENujhbHT3hmmyCwKBgQDBmhnc/BSVHb5MzouQ
0mKrKw1CGm1J6teNhjKNEOyyuiGaHkuUNGlMUgVOPVFoVnar+lgruBj8q0lABvt6
EAoLA61dFZ8hkDVtnw46caYqAtW2j5E2kJ8/3OXN7cL4eBQ+yPujoeAAIk6b1ZEc
qY9W2iq2RRd5dyZNAZRt1bo31g==
-----END PRIVATE KEY-----`;

const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function run() {
    try {
        await auth.authorize();
        console.log('Auth OK');
        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.get({
            spreadsheetId: '1NZeqFWiJMvC8O5n0ju2Lqqb7vsoBP-UA89FqJSktTYY',
        });
        console.log('Spreadsheet Title:', res.data.properties.title);
    } catch (e) {
        console.error('API Error:', e.message);
    }
}
run();
