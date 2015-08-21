var express = require('express');
var router = express.Router();

// Init chennels dummy dataset
var _channelsByCountryDictionary = new Object();
_channelsByCountryDictionary['FR'] = ['arutz la dvivon', 'marmelade tv']; // France
_channelsByCountryDictionary['IL'] = ['arutz yahadut', 'knesset TV']; // israel
_channelsByCountryDictionary['NL'] = ['bergkamp TV'];

// Create a geocoder that will be used for coordinates
var extra = {
    formatter: 'string',         // set response format
    formatterPattern: '%p'       // We want the country 2 char's code..
};
var geocoder = require('node-geocoder')('google', 'http', extra);

// Create a geocoder that will be used for IP geocoding
var satelize = require('satelize');

/* get channels by coordinates service . */
router.get('/channels', function(request, response, next) {

    if (request.query.lat && request.query.lon) {

        // Try getting the user's country by coordinates
        geocoder.reverse({lat: request.query.lat, lon: request.query.lon}, function (err, geoData) {

            if (!err && geoData) {

                sendResponse(response, geoData[0]);
            }
            else // No luck using coordinates - try using geocoding by IP as fallback
            {
                getByChannelsByIP(request, response);
            }
        });
    }
    else {
        // No coordinates supplied - fallback to geocoding by IP instead
        getChannelsByIP(request, response);
    }
});

// This method is used to retrive the list of channels by the user's ip
function getChannelsByIP(request, response)
{

    // Get the client's ip address (try out different header fields - sometimes it's behind a proxy..)
    var clientIP = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;

    //79.182.189.244 - for israel
    //  var clientIP = '::ffff:79.182.189.244';

    // Using the satlize module to get the client's location by ip (it supports both ipv6 and ipv4)
    satelize.satelize({ip: clientIP}, function (err, geoData) {

        try {
            if (!err && geoData) {
                sendResponse(response, JSON.parse(geoData).country_code)
            }
            else {
                sendErrorResponse(response, "ERROR_LOCATING_CLIENT");
            }
        }
        catch (e) // Handling error in synchronius code - incase json.parse throws an error.
        {
            console(e);
            sendErrorResponse(response, 'UNKNOWN_ERROR')
        }
    });

}

// This method extracts the list of channels from the dataset and sends 'em to the client
function sendResponse(response, countryCode)
{

    // Get the channels list by country code
    var channelsList = _channelsByCountryDictionary[countryCode];

    if (channelsList)
    {
        sendSuccessResponse(response, channelsList);
    }
    else {
        sendErrorResponse(response, 'COUNTRY_NOT_LISTED');
    }
}

function sendErrorResponse(res,err)
{
    res.send({status: 'ERROR', data: err });
}

function sendSuccessResponse(res, data)
{
    res.send({status: 'SUCESS', data: data });
}


module.exports = router;