'use strict';

var gamerLogic = require('../gamer/gamer.logic');
var myConst = require('../consts');
var sellHelper = require('../sellIllusiveHelper');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var marketBuySchema = new Schema ({
    marketID: Schema.Types.ObjectId,
    marketName: String,
    devID: String,
    marketType: String,
    taxes: Number,
    currencyAnother: String,
    currencyTypeBuy: String,
    bestPrice: Number,
    curBuyings: Number, // if(curBuyings > newPrice) -> price changes in illusive markets
    newPrice: Number, // for illusive markets
    offers: [ { price: Number, amount: Number, offersInPrice: [ { amount: Number, userID: Schema.Types.ObjectId }] }],
    graphicBuy: [{ price: Number, date: { type: Date, default: Date.now() }}]  // price changing in a market
});

var marketBuy  = mongoose.model('MarketBuy', marketBuySchema);


exports.getMarketBuy = function(devID, response) {
    marketBuy.find({devID: devID}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            response.json({"result": "SUCCESS", "marketBuys": res});
        }
    });
};

exports.postMarketBuy = function(MarketBuy) {
    marketBuy.create(MarketBuy, function (err, res){
        if(err) {
            console.warn(err);
        } else {
            console.warn("Success");
        }
    });
};

exports.updateEntireMarket = function (Market, response) {

    marketBuy.findOneAndUpdate({_id : Market._id}, Market, function (err, res) {
        if (err)
            response.status(500).send(err);
        else {
            res.save();
            response.json({success: true});
        }
    });
};

exports.updateTax = function(Market, response) {
    marketBuy.findOne({marketID: Market._id}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            res.tax = Market.tax;
            res.save();
        }
    });
};

exports.updateMarketType = function(Market, response) {
    marketBuy.findOne({marketID: Market._id}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            res.marketType = Market.marketType;
            res.save();
        }
    });
};

exports.findUserOffer = function(Market, userId, response) {
    marketBuy.findOne({marketID: Market._id}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            var found = false;
            var offers = [];
            for(var i = 0; i < res.offers.length; i++) {
                for(var j = 0; j < res.offers[i].offersInPrice.length; j++) {
                    if(res.offers[i].offersInPrice[j].gamerID == userId)
                    {
                        found = true;
                        console.log("found offer");
                        var userOffer = res.offers[i].offersInPrice[j];
                        userOffer.price = res.offers[i].Price;
                        offers.push(userOffer);
                    }
                }
            }
            if(found)
                response.json({"result": "SUCCESS", "userOffer": offers});
            else
                response.json({"Result": "Not found"});
        }
    });
};

exports.findOrCreateOffer = function(MarketID, userId, price, amount, response) {
    marketBuy.findOne({marketID: MarketID}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            var found = false;
            for(var i = 0; i < res.offers.length; i++) {
                if(res.offers[i].Price == price) {
                    for (var j = 0; j < res.offers[i].offersInPrice.length; j++) {
                        if (res.offers[i].offersInPrice[j].gamerID == userId) {
                            console.log("found offer");
                            found = true;
                            res.offers[i].offersInPrice[j].amount += amount;
                            res.offers[i].Amount += amount;
                            break;
                        }
                    }
                }
                break;
            }
            if(!found) {
                var offers = {};
                offers.Price = price;
                offers.Amount = amount;
                offers.offersInPrice = [];
                var offer = {};
                offer.amount = amount;
                offer.gamerID = userId;
                offers.offersInPrice.push(offer);
                res.offers.push(offers);
                console.log("create offer");
            }
            res.save();
            response.json({success: true});
        }
    });
};

exports.findAndRemoveUserOffer = function(Market, userId, price, response) {
    marketBuy.findOne({marketID: Market._id}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            var found = false;
            for(var i = 0; i < res.offers.length; i++) {
                if (res.offers[i].Price == price) {
                    for (var j = 0; j < res.offers[i].offersInPrice.length; j++) {
                        if (res.offers[i].offersInPrice[j].gamerID == userId) {
                            console.log("found offer");
                            found = true;
                            var mygamer = {};
                            mygamer.userID = userId;
                            mygamer.wallet = {};
                            mygamer.wallet.amount = res.offers[i].offersInPrice[j].amount;
                            mygamer.wallet.marketID = Market._id;
                            mygamer.wallet.currencyType = res.currencyTypeBuy;
                            gamerLogic.UpdateWallet(mygamer);
                            res.offers[i].offersInPrice.splice(j, 1);
                            res.save();
                            response.json({success: true});
                            break;
                        }
                    }
                }
                break;
            }
            if(!found)
                response.json({"Result": "Not found"});
        }
    });
};

// transactions methods

exports.UpdatePriceIllusive = function(marketId, percent, response) {
    marketBuy.findOne({marketID: marketId}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            var price = res.offers[0].Price * (1 + parseFloat(percent) / 100);
            res.offers[0].Price = price;
            res.bestPrice = price;
            var point = {};
            point.price = price;
            point.date = Date.now();
            res.graphicBuy.push(point);
            console.log("graph and price are updated! Again!");
            res.save();
        }
    });
};

exports.checkPriceBuy = function(gamer, response, callbackGamer, callbackMarketUpdate) {
    marketBuy.findOne({marketID: gamer.wallet.marketID}).exec(function (err, res) {
        if(err){
            response.send(500, {error: err});
        } else {
            var transaction = false;
            for(var i = 0; i < res.offers.length; i++)
            {
                if(res.offers[i].Price == gamer.DesirePrice)
                {
                    var index = i;
                    console.log("Cool! Transaction is possible! Price is found");
                    if(res.offers[i].Amount > gamer.wallet.amount) {
                        // calculate cost
                        var cost = gamer.wallet.amount * gamer.wallet.price;
                        // calculate final purchase (with taxes)
                        gamer.wallet.amount -= ((parseFloat(res.taxes) / 100) * gamer.wallet.amount);
                        console.log("Cool! It will be full transaction!");
                        // checkPaying capacity
                        callbackGamer(gamer.userID, myConst.TransactionSucces, cost, res.currencyAnother, gamer.wallet.amount,
                            res.currencyTypeBuy, res.marketID, i, response, callbackMarketUpdate);
                    } else {
                        // calculate cost
                        var isPartial = true;
                        if(res.offers[i].Amount == gamer.wallet.amount)
                            isPartial = false;
                        cost = res.offers[i].Amount * gamer.wallet.price;
                        // calculate final purchase (with taxes)
                        gamer.wallet.amount -= ((parseFloat(res.taxes) / 100) * res.offers[i].Amount);
                        //res.offers.remove(i);
                        if(res.offers[i].Amount == gamer.wallet.amount)
                            if(isPartial) {
                                console.log("Not Cool! It will pe partial transaction!");
                                callbackGamer(gamer.userID, myConst.TransactionPartialSuccess, cost, res.currencyAnother, gamer.wallet.amount,
                                    res.currencyTypeBuy, res.marketID, i, response, callbackMarketUpdate);
                            } else {
                                console.log("Cool! It will be full transaction, but it needs updates!");
                                callbackGamer(gamer.userID, myConst.TransactionSuccesWithUpdates, cost, res.currencyAnother, gamer.wallet.amount,
                                    res.currencyTypeBuy, res.marketID, i, response, callbackMarketUpdate);
                            }
                    }
                    transaction = true;
                    break;
                }
            }
            res.save();
            if(!transaction) {
                console.log("Not cool at all! Transaction failed.");
                response.json({"result": myConst.TransactionFailed, "PriceIsChanged": res.bestPrice});
            }
        }
    });
};

exports.UpdateMarket = function(MarketID, transaction, index, amount, response) {
    marketBuy.findOne({marketID: MarketID}).exec(function (err,res) {
        if(err){
            response.send(500, {error: err});
        } else {
            if(res.marketType == myConst.RealMarket)
            {
                // update offers
                var myOffers = [];
                var Amount = amount;
                for(var i = 0; i < res.offers[index].offersInPrice.length; i++)
                {
                    if(res.offers[index].offersInPrice[i].amount < amount)
                    {
                        amount -= res.offers[index].offersInPrice[i].amount;
                        myOffers.push(res.offers[index].offersInPrice[i]);
                        res.offers[index].offersInPrice.splice(i, 1);
                    } else {
                        var myOffer = {};
                        myOffer.amount = amount;
                        myOffer.gamerID = res.offers[index].offersInPrice[i].gamerID;
                        myOffers.push(myOffer);
                        if(res.offers[index].offersInPrice[i].amount == amount)
                            res.offers[index].offersInPrice.splice(i, 1);
                        else
                            res.offers[index].offersInPrice[i].amount -= amount;
                    }
                }
                console.log("offers are updated!");
                // update wallets
                var myGamer = {};
                var wallet = {};
                wallet.currencyType = res.currencyTypeBuy;
                wallet.marketID = MarketID;
                myGamer.wallet = wallet;
                gamerLogic.UpdateWallets(myGamer, myOffers, response);
                // need to update price
                if(transaction != myConst.TransactionSucces)
                {
                    res.offers.splice(index);
                    // findnewprice
                    var newPrice = Infinity;
                    for(i = 0; i < res.offers.length; i++)
                    {
                        if(newPrice > res.offers[i].Price)
                        {
                            newPrice = res.offers[i].Price;
                        }
                    }
                    res.bestPrice = newPrice;
                    //update graph
                    var point = {};
                    point.price = newPrice;
                    point.date = Date.now();
                    res.graphicBuy.push(point);
                } else {
                    res.offers.Amount -= Amount;
                }

            }
            if(res.marketType == myConst.SimulatedMarket)
            {
                if(transaction != myConst.TransactionSucces)
                    console.log("Wtf is happened!");
                res.curBuyings += amount;
                var percent = 0;
                while(res.curBuyings > res.newPrice) {
                    res.curBuyings -= res.newPrice;
                    percent++;
                }
                if(percent != 0) {
                    var price = res.offers[0].Price * (1 - parseFloat(percent) / 100);
                    res.offers[0].Price = price;
                    res.bestPrice = price;
                    point = {};
                    point.price = price;
                    point.date = Date.now();
                    res.graphicBuy.push(point);
                    console.log("graph and price are updated!");
                    sellHelper.updateIllusivePrice(MarketID, percent, response);
                }
            }
            res.save();
            response.json({ "Result": transaction });
        }
    });
};
