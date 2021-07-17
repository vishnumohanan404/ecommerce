const db            = require('../config/connection');
const collections   = require('../config/collections');
const bcrypt        = require('bcrypt');
const { response }  = require('express');
const objectId      = require('mongodb').ObjectID;
const { ObjectID }  = require('bson');
var random          = require('random-key-generator');




module.exports  = {

    doSignUp: (loginCredentials)=>{
        return new Promise (async (resolve,reject)=>{
            loginCredentials.password = await bcrypt.hash(loginCredentials.password,10)
            db.get().collection(collections.ADMIN_COLLECTION).insertOne(loginCredentials).then((data)=>{
                resolve(data.ops[0])
            })
        })
    },

    doLogin: (loginCredentials)=>{
        return new Promise (async (resolve,reject)=>{
            let admin = await db.get().collection(collections.ADMIN_COLLECTION).findOne({email:loginCredentials.admin_email})
            
            if(admin){
                bcrypt.compare(loginCredentials.password,admin.password).then((status)=>{
                    if(status){
                        response.admin  = admin;
                        response.status = true;
                        resolve(response);
                    }else{
                        response.status = false;
                        resolve(response)
                    }
                })
            }else{
                status = false;
                resolve(status);
            }
        })
    },

    addCategory: (category)=>{
        return new Promise (async (resolve, reject)=>{
            let check   = await db.get().collection(collections.CATEGORY_COLLECTION).find({categories:category.categories}).count()

            if(check){
                status= false;
                resolve(status)
            }else{
                await db.get().collection(collections.CATEGORY_COLLECTION).insertOne(category).then((status)=>{
                resolve(status)
                })
            }
            
        })
    },
    
    getCategories: ()=>{
        return new Promise (async (resolve, reject)=>{
            let categories = await db.get().collection(collections.CATEGORY_COLLECTION).find().toArray()
            resolve(categories)
        })
    },

    deleteCategory: (id)=>{
        return new Promise (async (resolve,reject)=>{
            await db.get().collection(collections.CATEGORY_COLLECTION).removeOne({_id:objectId(id)}).then((status)=>{
                console.log("removed from collection");
                resolve(status);
            })
        })
    },

    getAllUsers: ()=>{
        return new Promise (async (resolve,reject)=>{
            let users = await db.get().collection(collections.USER_COLLECTION).find().toArray().then()
            resolve(users)
        })
    },

    getUserDetails: (id)=>{
        return new Promise (async(resolve,reject)=>{
            let user  = await db.get().collection(collections.USER_COLLECTION).findOne({_id:ObjectID(id)})
            resolve(user)
        })
    },

    getAllVendors: ()=>{
        return new Promise (async(resolve,reject)=>{
            let vendors = await db.get().collection(collections.VENDOR_COLLECTION).find().toArray()
            resolve(vendors)
        })
    },

    blockVendor: (id)=>{
        return new Promise (async(resolve,reject)=>{
            await db.get().collection(collections.VENDOR_COLLECTION).updateOne({_id:ObjectID(id)},{$set:{block:"1"}}).then(()=>{
                resolve()
            })
        })
    },

    unblockVendor: (id)=>{
        return new Promise (async (resolve,reject)=>{
            await db.get().collection(collections.VENDOR_COLLECTION).updateOne({_id:ObjectID(id)},{$unset:{block:""}}).then(()=>{
                resolve();
            })
        })
    },

    getVendorDetails: (id)=>{
        return new Promise ((resolve,reject)=>{
            db.get().collection(collections.VENDOR_COLLECTION).findOne({_id:ObjectID(id)}).then((result)=>{
                resolve(result)
            })
        })
    },

    getVendorOrderDetails: (vendor)=>{
        return new Promise(async (resolve,reject)=>{
            let orders      = await db.get().collection(collections.ORDER_COLLECTION).find(
                {
                    cart:{$elemMatch:{"product.vendorid":ObjectID(vendor)}},
                    cancel:false
                }).count()
            let delivered   = await db.get().collection(collections.ORDER_COLLECTION).find(
                {
                    cart:{$elemMatch:{"product.vendorid":ObjectID(vendor)}},
                    cart:{$elemMatch:{"product.status":"Delivered"}}
                }).count()
            let shipped  = await db.get().collection(collections.ORDER_COLLECTION).find(
                {
                    cart:{$elemMatch:{"product.vendorid":ObjectID(vendor)}},
                    cart:{$elemMatch:{"product.status":"Shipped"}},
                    cancel:false
                }).count()
            let cancelled  = await db.get().collection(collections.ORDER_COLLECTION).find(
                {
                    cart:{$elemMatch:{"product.vendorid":ObjectID(vendor)}},
                    cancel:true
                }).count()
            let products   = await db.get().collection(collections.PRODUCT_COLLECTION).find({vendorid:ObjectID(vendor)}).count()
            response.orders     = orders
            response.delivered  = delivered
            response.shipped    = shipped
            response.cancelled  = cancelled
            response.products   = products
            resolve(response)
        })
    },

    getDashboardDetails: ()=>{
        return new Promise(async(resolve,reject)=>{
            let users           = await db.get().collection(collections.USER_COLLECTION).find({}).count()
            let orders          = await db.get().collection(collections.ORDER_COLLECTION).find({}).count()
            let vendors         = await db.get().collection(collections.VENDOR_COLLECTION).find({}).count()
            let shipped         = await db.get().collection(collections.ORDER_COLLECTION).find({"cart.product.shipped":true}).count()
            let delivered       = await db.get().collection(collections.ORDER_COLLECTION).find({"cart.product.delivered":true}).count()
            let products        = await db.get().collection(collections.PRODUCT_COLLECTION).find({}).count()
            let categoryDetails = await db.get().collection(collections.CATEGORY_COLLECTION).aggregate([
                {
                    $lookup:{
                        from:"products",
                        localField:"categories",
                        foreignField:"category", 
                        as:"products"
                    }
                },
                {
                    $addFields:{
                        count: {
                            $size: "$products"
                        }
                    }
                },
                {
                    $project:{
                        "categories":1,
                        "count":1,
                        "_id":0
                    }
                }
            ]).toArray()
            let orderDetails   = await db.get().collection(collections.ORDER_COLLECTION).find({cancel:false,"cart.product.delivered":true}).toArray()
            let revenueData    = await db.get().collection(collections.ORDER_COLLECTION).find({cancel:false,"cart.product.delivered":true}).sort({_id:1}).limit(6).toArray();
            response.orderDetails    = orderDetails
            response.categoryDetails = categoryDetails
            response.orders          = orders
            response.vendors         = vendors
            response.users           = users
            response.shipped         = shipped
            response.delivered       = delivered
            response.products        = products
            response.revenueData     = revenueData
            resolve(response)
        })
    },

    getCategoryOffer: (catId)=>{
        return new Promise(async(resolve,reject)=>{
            let discount = await db.get().collection(collections.CATEGORY_COLLECTION).findOne({_id:ObjectID(catId)})
            if (discount){
                console.log(discount,"discount from categort");
                resolve(discount)
            }else{
                reject()
            }
        })
    },

    postOffer: (offPerc,offer,catId,catName)=>{
        return new Promise(async(resolve,reject)=>{
            offPerc = parseInt(offPerc)
            console.log('admin helper')
            // set category offer in products collection
            let products    = await db.get().collection(collections.PRODUCT_COLLECTION).find({category:catName,discount:false}).toArray()
            console.log(products,"products");
            await products.forEach((element)=>{
                console.log(element,"elements in find")
                db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:element._id,discount:false},
                    [{ $set: 
                        { 
                            price         : { $multiply: [ offer, "$price" ] },
                            discount      : true,
                            offPercentage : parseInt(offPerc),
                            catOff        : true,
                            actualPrice   : "$price",
                            discountPrice : { $multiply: [ offer, "$price" ] }
                        } 
                    }]
                )
            })
            // offer update in category collection
            if(offPerc === 0){
                await db.get().collection(collections.CATEGORY_COLLECTION).updateOne({_id:ObjectID(catId)},
                [{ $set: 
                    { 
                        offer      : false,
                        offPercentage : parseInt(offPerc),
                    } 
                }]
                ).then((result)=>{
                    console.log(result);
                    resolve()
                })
            }else{
                await db.get().collection(collections.CATEGORY_COLLECTION).updateOne({_id:ObjectID(catId)},
                [{ $set: 
                    { 
                        offer      : true,
                        offPercentage : parseInt(offPerc),
                    } 
                }]
                ).then((result)=>{
                    console.log(result);
                    resolve()
                })
            }
            
        })
    },

    deleteCategoryOffer: (catId,catName)=>{
        return new Promise(async(resolve,reject)=>{
            // remove offers from product collection
            let products    = await db.get().collection(collections.PRODUCT_COLLECTION).find({category:catName,discount:true,catOff:true}).toArray()
            console.log(products);
            await products.forEach((element)=>{
                console.log(element,"elements from find")
                db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:element._id},
                    [{ $set: 
                        { 
                            price         : "$actualPrice",
                            discount      : false,
                            offPercentage : 0,
                            catOff        : false,
                            discountPrice : 0
                        } 
                    }]
                )
            })
            // remove offers from category collection
            await db.get().collection(collections.CATEGORY_COLLECTION).updateOne({_id:ObjectID(catId)},
                [{ $set: 
                    { 
                        offer      : false,
                        offPercentage : 0,
                    } 
                }]
                ).then((result)=>{
                    console.log(result);
                    resolve()
                }).catch(()=>{
                    reject()
                })
        })
    },

    getOrderReport: ()=>{
        return new Promise(async(resolve,reject)=>{
            let orders= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                {
                    $unwind:"$cart"
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

    getUserReport: ()=>{
        return new Promise(async (resolve,reject)=>{
            let users = db.get().collection(collections.USER_COLLECTION).aggregate([
                {
                  $lookup: {
                    from: "orders",
                    localField: "_id",
                    foreignField: "userId",
                    as: "orders",
                  },
                },
                {
                  $project: {
                    firstname: 1,
                    lastname: 1,
                    email: 1,
                    phone: 1,
                    numberOfOrders: { $size: "$orders" },
                  },
                },
              ])
              .toArray();
              resolve(users)
        })
    },

    getVendorReport: ()=>{
        return new Promise(async(resolve,reject)=>{
            let vendor = db.get().collection(collections.VENDOR_COLLECTION).aggregate([
                {
                    $lookup:{
                        from:"products",
                        localField:"_id",
                        foreignField:"vendorid",
                        as:"Products"
                    }
                },
                {
                    $project:{
                        "name":1,
                        "email":1,
                        "phone":1,
                        "noOfProducts":{$size:"$Products"}
                    }
                }
            ]).toArray()
            resolve(vendor)
        })
    },

    getAllCoupons: ()=>{
        return new Promise(async(resolve,reject)=>{
            let coupons = await db.get().collection(collections.COUPON_COLLECTION).find({}).toArray()
            resolve(coupons)
        })
    },

    addCoupon: (coupon)=>{
        return new Promise(async(resolve,reject)=>{
            let text = coupon.text
            coupon.status = true
            console.log(coupon.coupon,"this is  coupon");
            db.get().collection(collections.COUPON_COLLECTION).insertOne({
                coupon      :   coupon.coupon,
                user        :   ObjectID(coupon.user),
                couponType  :   coupon.coupontype,
                couponDesc  :   coupon.desc,
                offer       :   coupon.offer,
                status      :   true
            }).then((data)=>{
                console.log(data.ops[0],"this should be inserted to user");
                db.get().collection(collections.USER_COLLECTION).updateOne({_id:ObjectID(coupon.user)},{
                    $push:{
                        "coupons": data.ops[0]
                    }
                })
                resolve(data.ops[0])
            })
        })
    },

    blockUser: (id)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.USER_COLLECTION).updateOne({_id:ObjectID(id)},{$set:{block:true}}).then(()=>{
                resolve()
            })
        })
    },

    unblockUser: (id)=>{
        return new Promise(async (resolve,reject)=>{
            await db.get().collection(collections.USER_COLLECTION).updateOne({_id:ObjectID(id)},{$set:{block: false}}).then(()=>{
                resolve()
            })
        })
    },
    
    getVendorProducts: (id)=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).find({vendorid:ObjectID(id)}).toArray();
            resolve(products)
        })
    },

    getVendorProductDetails:(id)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:ObjectID(id)}).then((result)=>{
                resolve(result)
            })
        })
        
    }

}