const db                = require('../config/connection');
const collections       = require('../config/collections');
const bcrypt            = require('bcrypt');
const { response }      = require('express');
const objectId          = require('mongodb').ObjectID;
const { ObjectId } = require('bson');
// modules to export 

module.exports={

    doSignUp: (userData)=>{
        return new Promise(async (resolve,reject)=>{
            userData.password       = await bcrypt.hash(userData.password,10);
            userData.cnfpassword    = await bcrypt.hash(userData.cnfpassword,10);
            userData.phone          = parseInt(userData.phone)
            db.get().collection(collections.VENDOR_COLLECTION).insertOne(userData).then((data)=>{
                // console.log(data , data.ops);
                resolve(data.ops[0])
            })
        })
    },

    vendorCheck: (userData)=>{
        return new Promise (async (resolve,reject)=>{
            let emailCheck  = await db.get().collection(collections.VENDOR_COLLECTION).find({email:userData.email}).count();
            if (emailCheck){
                status  = true;
                resolve(status)
            }else{
                status  = false;
                resolve(status)
            }
        })
    },
    doLogin: (loginCredentials)=>{
        return new Promise(async (resolve,reject)=>{
            let vendor    = await db.get().collection(collections.VENDOR_COLLECTION).findOne({email:loginCredentials.vendor_email})
            if(vendor){   
                let block = vendor.block 
                console.log(block);
                if(!block){
                    bcrypt.compare(loginCredentials.password,vendor.password).then((status)=>{
                        if(status){
                            response.userBlocked = false
                            response.vendor   = vendor;
                            response.status   = true;
                            resolve(response)
                        }else{
                            response.userBlocked = false
                            response.status = false;
                            resolve(response);
                        }
                    });
                }else {
                    console.log("User Blocked")
                    response.userBlocked = true
                    response.status = false;
                    console.log(response.status)
                    resolve(response)
                }  
                
            }else{
                status  = false;
                resolve(status);
            }
        });
    },

    getAllCategories: ()=>{
        return new Promise (async (resolve,reject)=>{
             let categories = await db.get().collection(collections.CATEGORY_COLLECTION).find().toArray()
             resolve(categories)
        }) 
    },

    addProduct: (product)=>{
        
        return new Promise (async(resolve,reject)=>{
            product.vendorid    = ObjectId(product.vendorid)
            product.price       = parseFloat(product.price)
            product.stocks      = parseInt(product.stocks)
            product.discount    = false;
            product.actualPrice = product.price
            db.get().collection(collections.PRODUCT_COLLECTION).insertOne(product).then((result)=>{
                resolve(result.ops[0]._id);
            })
        })
    },

    getAllProducts: (vendor)=>{
        return new Promise (async(resolve,reject)=>{
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).find({vendorid:ObjectId(vendor)}).toArray();
            resolve(products)
        })
    },

    deleteProduct: (id)=>{
        return new Promise (async(resolve,reject)=>{
            await db.get().collection(collections.PRODUCT_COLLECTION).deleteOne({_id:ObjectId(id)}).then(()=>{
                resolve();
            })
        })
    },

    getOrdersForVendors: (vendor)=>{
        return new Promise(async (resolve,reject)=>{
            let orders= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $unwind:"$cart"
                },
                {
                    $match:{
                        "cart.product.vendorid":ObjectId(vendor),
                        "pending":false
                    }
                },
                {
                    $lookup:{
                        from:"users",
                        localField:"userId",
                        foreignField:"_id",
                        as:"user"
                    }
                },
                {
                    $unwind:'$user'
                },
                {
                    $lookup:{
                        from:"vendors",
                        localField:"cart.product.vendorid",
                        foreignField:"_id",
                        as:"vendorDetails"
                    }
                },
                {
                    $unwind:"$vendorDetails"
                },
                {
                    $addFields:{
                        'cart.productTotal':{
                            $multiply:[
                                "$cart.quantity",{$toInt: '$cart.product.price'}
                            ]
                        }
                    }
                }
            ]).toArray()

            resolve(orders)
        })
    },

    shipProduct: (userId,orderId,productId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.ORDER_COLLECTION).findOneAndUpdate({
                userId:ObjectId(userId),
                _id:ObjectId(orderId),
                'cart.product._id':ObjectId(productId)},
                {
                    $set:{
                        "cart.$.product.status":"Shipped",
                        "cart.$.product.shipped":true,
                        "cart.$.product.delivered":false
                    }
                }
            ).then(()=>{
                resolve()
            })
        })
    },

    deliverProduct: (userId,orderId,productId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.ORDER_COLLECTION).findOneAndUpdate({
                userId:ObjectId(userId),
                _id:ObjectId(orderId),
                'cart.product._id':ObjectId(productId)},
                {
                    $set:{
                        "cart.$.product.status":"Delivered",
                        "cart.$.product.delivered":true,
                        "cart.$.product.shipped":false,
                    }
                }
            ).then(()=>{
                resolve()
            })
        })
    },

    getOrderDetails: (orderId,vendorId,proId)=>{
        return new Promise(async(resolve,reject)=>{
            let order= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $unwind:"$cart"
                },
                {
                    $match:{
                        "cart.product.vendorid":ObjectId(vendorId),
                        "_id":ObjectId(orderId),
                        "pending":false,
                        "cart.product._id":ObjectId(proId)
                    }
                },
                {
                    $lookup:{
                        from:"users",
                        localField:"userId",
                        foreignField:"_id",
                        as:"user"
                    }
                },
                {
                    $unwind:'$user'
                },
                {
                    $lookup:{
                        from:"vendors",
                        localField:"cart.product.vendorid",
                        foreignField:"_id",
                        as:"vendorDetails"
                    }
                },
                {
                    $unwind:"$vendorDetails"
                },
                {
                    $addFields:{
                        'cart.productTotal':{
                            $multiply:[
                                "$cart.quantity",{$toInt: '$cart.product.price'}
                            ]
                        }
                    }
                }
            ]).toArray()
            console.log(order[0]);
            resolve(order[0])
        })
    },

    getDiscount: (proId)=>{
        return new Promise(async(resolve,reject)=>{
            let discount = await db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:ObjectId(proId),discount:true})
            if(discount){
                resolve(discount)
            }else{
                reject()
            }
        })
    },

    getDashboardDetails: (vendor)=>{
        return new Promise(async(resolve,reject)=>{
            let orders= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $unwind:"$cart"
                },
                {
                    $match:{
                        "cart.product.vendorid":ObjectId(vendor),
                        "pending":false
                    }
                },
                {
                    $lookup:{
                        from:"users",
                        localField:"userId",
                        foreignField:"_id",
                        as:"user"
                    }
                },
                {
                    $unwind:'$user'
                },
                {
                    $lookup:{
                        from:"vendors",
                        localField:"cart.product.vendorid",
                        foreignField:"_id",
                        as:"vendorDetails"
                    }
                },
                {
                    $unwind:"$vendorDetails"
                },
                {
                    $addFields:{
                        'cart.productTotal':{
                            $multiply:[
                                "$cart.quantity",{$toInt: '$cart.product.price'}
                            ]
                        }
                    }
                }
            ]).toArray()
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).find({vendorid:ObjectId(vendor)}).count()
            let customers= await db.get().collection(collections.ORDER_COLLECTION).distinct("userId",{"cart.product.vendorid":ObjectId(vendor)})
            response.orders     = orders.length
            response.products   = products
            response.customers  = customers.length
            resolve(response)
        })
    },

    postDiscount: (proId,offer,perc)=>{
        return new Promise(async(resolve,reject)=>{
            if(perc == 0){
                await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},
            
                [{ $set: 
                    {   
                        price: "$actualPrice",
                        discountPrice : 0,
                        discount      : false,
                        offPercentage : perc
                    } 
                }]
            ).then(()=>{
                resolve()
            })
            }else{
                await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},
            
                [{ $set: 
                    { 
                        price         : { $multiply: [ offer, "$actualPrice" ] },
                        discount      : true,
                        offPercentage : perc,
                        discountPrice : { $multiply: [ offer, "$actualPrice" ] }
                    } 
                }]
            ).then((result)=>{
                console.log(result);
                resolve()
            }).catch(()=>{
                reject()
            })
            }
        })
    },

    removeOffer: (proId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},
            [{ $set: 
                { 
                    price         : "$actualPrice" ,
                    discount      : false,
                    offPercentage : 0,
                    discountPrice : 0,
                    catOff:false
                } 
            }]).then((response)=>{
                resolve(response)
            })
        })
    },
    
    getOfferProducts: (id)=>{
        return new Promise(async(resolve,reject)=>{
            let offers = await db.get().collection(collections.PRODUCT_COLLECTION).find({vendorid:ObjectId(id),discount:true}).toArray()
            resolve(offers)
        })
    },

    getCustomers: (id)=>{
        return new Promise(async(resolve,reject)=>{
            let customers = await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $match:{
                        "cart.product.vendorid":ObjectId(id),
                        "pending":false
                    }
                },
                {
                    $group:{
                        _id:null,
                        users:{$addToSet: "$userId"}
                    }
                },
                {
                    $unwind:"$users"
                },
                {
                    $lookup:{
                        from:"users",
                        localField:"users",
                        foreignField:"_id",
                        as:"user"
                    }
                },
                {
                    $unwind:"$user"
                },
                {
                    $project:{
                        _id:0,
                        "users":0
                    }
                }
            ]).toArray()
            resolve(customers)
        })
    }

}