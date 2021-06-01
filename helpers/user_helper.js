const db                = require('../config/connection');
const collections       = require('../config/collections');
const bcrypt            = require('bcrypt');
const ObjectId          = require('mongodb').ObjectID;
const { response }      = require('express');
const Razorpay          = require('razorpay');
const env               = require('dotenv').config();
const crypto            = require('crypto');
var moment              = require('moment');
var random              = require('random-key-generator');
const { ObjectID } = require('bson');
const { resolve } = require('path');
var instance            = new Razorpay({
                            key_id: 'rzp_test_IKTD1Jw6ZMVbm7',
                            key_secret: 'BdRNzQv3Py0EQQPV1Q7624An',
                        });

// modules to export

module.exports={
    
    doSignUp: (userData)=>{
        return new Promise(async (resolve,reject)=>{
            userData.password       = await bcrypt.hash(userData.password,10);
            userData.cnfpassword    = await bcrypt.hash(userData.cnfpassword,10);
            userData.coupons        = [{coupon      :random.getRandom(3,'WEL','','front'),
                                        couponType  :'Welcome Coupon',
                                        couponDesc  : "Rs.200 Off",
                                        offer       : 200,
                                        status      : true}]
            
            db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data)=>{
                let coupon      = {
                    coupon      : data.ops[0].coupons[0].coupon,
                    user        : data.ops[0]._id,
                    couponType  : data.ops[0].coupons[0].couponType,
                    couponDesc  : "Rs.200 Off",
                    offer       : 200,
                    status      : true
                }
                db.get().collection(collections.COUPON_COLLECTION).insertOne(coupon).then(()=>{
                    resolve(data.ops[0])
                })
            })
        })
    },

    doLogin: (loginCredentials)=>{
        return new Promise(async (resolve,reject)=>{
            let user    = await db.get().collection(collections.USER_COLLECTION).findOne({email:loginCredentials.user_email})
            if(user){
                if(!user.block){
                    bcrypt.compare(loginCredentials.password,user.password).then((status)=>{
                        if(status){
                            response.userBlocked = false
                            response.user   = user;
                            response.status = true;
                            resolve(response)
                        }else{
                            console.log("wrong Password");
                            response.userBlocked = false
                            console.log(false);
                            response.status = false;
                            resolve(response);
                        }
                    });
                }else{
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

    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({
                user: ObjectId(userId)
            })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)

        })
    },

    userCheck: (userData)=>{
        return new Promise (async (resolve,reject)=>{
            let emailCheck  = await db.get().collection(collections.USER_COLLECTION).find({email:userData.email}).count();
            if (emailCheck){
                status  = true;
                resolve(status)
            }else{
                status  = false;
                resolve(status)
            }
        })
    },

    getAllCategories: ()=>{
        return new Promise(async(resolve,reject)=>{
            let categories = await db.get().collection(collections.CATEGORY_COLLECTION).find({}).toArray()
            resolve(categories)
        })
    },

    addToCart: (productId, userId)=>{
        return new Promise(async (resolve,reject)=>{
            let productObject = {
                item: ObjectId(productId), quantity:1
               }
            let userCart = await db.get().collection(collections.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                // here the variable 'product' is like a parameter for testing, whethr productId already exist in the
                // cart collection. if exist this test function will return its index value otherwise return -1 
                let productExist = userCart.products.findIndex(product=>product.item == productId)
                if(productExist != -1){
                    db.get().collection(collections.CART_COLLECTION).updateOne({
                         user:ObjectId(userId),
                        'products.item': ObjectId(productId)
                    },
                    {
                        $inc:{
                            'products.$.quantity':1
                        }
                    }).then(()=>{
                        resolve()
                    })
                }else{
                    db.get().collection(collections.CART_COLLECTION).updateOne({
                        user:ObjectId(userId)
                    },{
                        $push:{
                            products:productObject
                        }
                    })
                }
            }else{
                let cart = {
                    user:     ObjectId(userId),
                    products: [productObject],
                }
                db.get().collection(collections.CART_COLLECTION).insertOne(cart).then(()=>{
                    resolve()
                })
            }
        })
    },

    getCartCount: (id)=>{
        return new Promise(async(resolve,reject)=>{
            let count = 0;
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({
                user: ObjectId(id)
            })
            if(cart){
                count = cart.products.length
            }
            resolve(count)
        })
    } ,

    getCart: (userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems = await db.get().collection(collections.CART_COLLECTION).aggregate([
            {
                $match:{
                    user:ObjectId(userId)
                }
            },
            {
                $unwind:'$products'
            },
            {
                $project: {
                    item:      '$products.item',
                    quantity:  '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collections.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    _id: 1,
                    item: 1,
                    quantity: 1,
                    product:{
                        $arrayElemAt : ['$product',0]
                    }
                }
            }
        ]).toArray()
            resolve(cartItems)
        })
    },

    changeQuantity: (details)=>{
        details.count = parseInt(details.count);
        details.quantity = parseInt(details.quantity);
        console.log(details);
        return new Promise((resolve,reject)=>{
            if(details.count == -1 && details.quantity == 1){
                db.get().collection(collections.CART_COLLECTION).updateOne({_id:ObjectId(details.cart)},{
                    $pull:{products:{item:ObjectId(details.product)}}
                }).then((response)=>{
                    console.log("removeproduct is true");
                    resolve({removeProduct:true})
                })
            }else{
                db.get().collection(collections.CART_COLLECTION).updateOne({
                    _id: ObjectId(details.cart),
                    'products.item':ObjectId(details.product)
                },{
                    $inc:{
                        'products.$.quantity': details.count
                    }
                }).then((response)=>{
                    resolve({status:true})
                })
            }
        })

    },
    
    getSubtotal: (userId)=>{
        return new Promise(async(resolve,reject)=>{
           let subtotal = await db.get().collection(collections.CART_COLLECTION).aggregate([
            {
                $match: {
                         user:ObjectId(userId)
                        }
            },
            {
                $unwind:'$products'
            },
            {
                $project: {
                    item:      '$products.item',
                    quantity:  '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collections.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    _id: 1,
                    item: 1,
                    quantity: 1,
                    product:{
                        $arrayElemAt : ['$product',0]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }  
           ]).toArray()
           resolve(subtotal[0].total)
        })
    },

    deleteCartItem: (itemId,cartId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.CART_COLLECTION).updateOne({_id:ObjectId(cartId)},{
                $pull:{
                    products:{item:ObjectId(itemId)}
                }
            }).then((result)=>{
                resolve(result)
            })
        })
    },

    //total of single product
    getTotal: (userId)=>{
        return new Promise(async(resolve,reject)=>{
           let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
            {
                $match: {
                         user:ObjectId(userId)
                        }
            },
            {
                $unwind:'$products'
            },
            {
                $project: {
                    item:      '$products.item',
                    quantity:  '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collections.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    _id: 1,
                    item: 1,
                    quantity: 1,
                    product:{
                        $arrayElemAt : ['$product',0]
                    }
                }
            },
            {
                $project: {
                    _id:0,
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }
           ]).toArray()
           if (!total) {
                reject(response);
           }
           else {
            resolve(total)
           }
           
        })
    },

    //total of single product
    getTotalAfterQuantityChange: (userId)=>{
        return new Promise(async(resolve,reject)=>{
           let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
            {
                $match: {
                         user:ObjectId(userId)
                        }
            },
            {
                $unwind:'$products'
            },
            {
                $project: {
                    item:      '$products.item',
                    quantity:  '$products.quantity'
                }
            },
            {
                $lookup: {
                    from: collections.PRODUCT_COLLECTION,
                    localField: 'item',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $project: {
                    _id: 1,
                    item: 1,
                    quantity: 1,
                    product:{
                        $arrayElemAt : ['$product',0]
                    }
                }
            },
            {
                $project: {
                    _id:0,
                    total:{$sum:{$multiply:['$quantity','$product.price']}}
                }
            }
           ]).toArray()
           if (!total) {
                reject(response);
           }
           else {
            resolve(total[0].total)
           }
           
        })
    },

    verifyOtpRegister: (email,phone)=>{

        return new Promise(async(resolve,reject)=>{
            let emailCheck  = await db.get().collection(collections.USER_COLLECTION).findOne({email:email})
            let mobileCheck  = await db.get().collection(collections.USER_COLLECTION).findOne({phone:phone})
            if(emailCheck && mobileCheck){
                reject()
            }else if(mobileCheck){
                reject()
            }else if(emailCheck){
                reject()
            }else{
                resolve()
            }
        })
    },

    otpRegistration: (email,mobile)=>{
        let user = {
            email: email,
            phone : mobile
        }
        user.coupons        = [{
            coupon:random.getRandom(3,'WEL','','front'),
            couponType:'Welcome Coupon',
            couponDesc  : "Rs.200 Off",
            offer  : 200,
            status : true
        }]
        return new Promise( async (resolve,reject)=>{
            await db.get().collection(collections.USER_COLLECTION).insertOne(user).then((response)=>{
                response.user   = user;
                response.status = true;
                let coupon      = {
                    coupon      : response.ops[0].coupons[0].coupon,
                    user        : response.ops[0]._id,
                    couponType  : response.ops[0].coupons[0].couponType,
                    couponDesc  : "Rs.200 Off",
                    offer       : response.ops[0].coupons[0].offer,
                    status      : true
                }
                db.get().collection(collections.COUPON_COLLECTION).insertOne(coupon).then(()=>{
                    resolve(response)
                })
                
            })
        })
    },

    verifyOtpLogin: (mobile)=>{
        return new Promise (async(resolve,reject)=>{
            let mobileexist = await db.get().collection(collections.USER_COLLECTION).findOne({phone:mobile})
            if(mobileexist){
                resolve()
            }else{
                reject()
            }
        })
    },

    otpLogin: (mobile)=>{
        return new Promise(async(resolve,reject)=>{
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({phone:mobile})
            response.user = user
            resolve(response)
        })
    },

    getCheckout: (usercart)=>{
        return new Promise(async(resolve,reject)=>{
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({user:ObjectId(usercart)})
            resolve(cart)
        })
    },

    userAddressAdd: (userId,address)=>{
        let addressObj =  {
            _id         :ObjectId(),
            addressLine : address.add1,
            addressCity : address.city,
            addressZip  : address.zip
        }
        console.log(userId)
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.USER_COLLECTION).updateOne({_id:ObjectId(userId)},{
                    $push:{
                        addresses:addressObj
                    }
            }).then(()=>{
                resolve()
            })
        })
    },

    getAddress: (userId)=>{
        return new Promise (async(resolve,reject)=>{
            let address = await db.get().collection(collections.USER_COLLECTION).aggregate([
                {
                    $match:{_id:ObjectId(userId)}
                },
                {
                    $unwind:'$addresses'
                },
                {
                    $project:{
                        _id : '$addresses._id',
                        line: '$addresses.addressLine',
                        city: '$addresses.addressCity',
                        zip : '$addresses.addressZip'
                    }
                }
            ])
            .toArray()
            resolve(address)
            
        })
    },

    removeAddress:(user,address)=>{
        let userId      = user
        let addressId   = address
        console.log("this is the man from no where", addressId,"this is the man from alap", userId)
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.USER_COLLECTION).updateOne({_id:ObjectId(userId)},{
                $pull:{addresses:{_id:ObjectId(addressId)}}
            }).then(()=>{
                resolve()
            })
        })
    },

    placeOrder: (order,user,cart,coupon,subtotal)=>{
        return new Promise(async(resolve,reject)=>{
            let status      = (order.selector === 'cod')? 'Placed':'Pending';
            let pendingcheck   = (order.selector === 'cod')? false: true;
            let orderObject = {
                billingDetails:{
                    firstname : order.firstname,
                    lastname  : order.lastname,
                    email     : order.email,
                    mobile    : order.number
                },
                addressDetail :{
                   addressLine: order.add1,
                   addressCity: order.city,
                   addressZip : order.zip
                },
                userId        : ObjectId(user._id),
                paymentMethod : order.selector,
                cart          : cart,
                total         : subtotal,
                date          : new Date(),
                orderStatus   : status,
                pending       : pendingcheck,
                cancel        : false,
                coupon        : coupon
            }
            orderObject.date = moment(orderObject.date).format('MM/DD/YYYY , h:mm:ss a');
            console.log(orderObject);
            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObject).then((response)=>{
                if(order.selector=='cod'){
                db.get().collection(collections.CART_COLLECTION).removeOne({user:ObjectId(user._id)})
                }
                console.log(coupon.couponApplied);
                if(coupon.couponApplied){
                    db.get().collection(collections.USER_COLLECTION).updateOne({_id:ObjectId(user._id)},{
                        $pull:{
                            coupons:{
                                coupon: coupon.couponCode
                            }
                        }
                    }).then(()=>{
                        db.get().collection(collections.COUPON_COLLECTION).updateOne({coupon:coupon.couponCode},{
                            $set:{
                                "status" : false
                            }
                        })
                    })
                    
                }
                resolve(response.ops[0]._id)
            })
        }) 
    },

    generateRazorpayOrder: (orderId,subtotal)=>{
        return new Promise (async(resolve,reject)=>{
            var options = {
                amount: subtotal*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                resolve(order)
              });
        })
    },

    verifyPaymentSignature: (payment)=>{
        return new Promise (async(resolve,reject)=>{
            let hmac = crypto.createHmac('sha256','BdRNzQv3Py0EQQPV1Q7624An')
                     .update(payment['payment[razorpay_order_id]']+'|'+payment['payment[razorpay_payment_id]'])
                hmac = hmac.digest('hex')
            if(hmac===payment['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },

    updateOrderStatus: (orderId,userId)=>{
        return new Promise (async(resolve,reject)=>{
            await db.get().collection(collections.ORDER_COLLECTION).updateOne({_id:ObjectId(orderId)},{
                $set:{
                    orderStatus:'Placed',
                    pending    : false
                }
            }).then(()=>{
                db.get().collection(collections.CART_COLLECTION).removeOne({user:ObjectId(userId)})
                resolve()
            }).catch(()=>{
                reject()
            })
        })
    },

    getSingleOrderDetails: (orderId)=>{
        return new Promise (async(resolve,reject)=>{
            let orderDetails = await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:ObjectId(orderId)});
            if(orderDetails){
                resolve(orderDetails);
            }else{
                reject();
            }
        })
    },

    getOrdersForUsers:(user)=>{
        console.log(user);
        return new Promise (async(resolve,reject)=>{
            let orders = await db.get().collection(collections.ORDER_COLLECTION).find({userId:ObjectId(user),pending:false}).toArray()
            if(orders){
                console.log(orders);
                resolve(orders)
            }else{
                reject()
            }
        })
    },

    getOrderDetails:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.ORDER_COLLECTION).findOne({_id:ObjectId(orderId)}).then((orders)=>{
                    console.log(orders,"balls in the patrk");
                    resolve(orders)
            }).catch(()=>{
                reject()
            })
            
        })
    },

    cancelOrder: (orderId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.ORDER_COLLECTION).findOneAndUpdate({_id:ObjectId(orderId)},
            {
                $set:{
                    orderStatus             : "Cancelled",
                    cancel                  : true,
                }
            })
            resolve()
        })
    },

    getUserDetail:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({_id:ObjectId(userId)})
            if(user){
                console.log(user);
                resolve(user)
            }else{
                reject()
            }
        })
    },

    editUser: (userId, data)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.USER_COLLECTION).findOneAndUpdate({_id:ObjectId(userId)},{
                $set:{
                    firstname   : data.firstname,
                    lastname    : data.lastname,
                    email       : data.email,
                    phone       : data.phone
                }
            }).then(()=>{
                resolve()
            })
        })
    },

    changePassword: (userId, data)=>{
        return new Promise(async(resolve,reject)=>{
            let user = await db.get().collection(collections.USER_COLLECTION).findOne({_id:ObjectId(userId)})
            if(user){
                console.log("user data for compare", user.password,"and data from req.body",data.password,"new password")
                bcrypt.compare(data.password,user.password).then(async (status)=>{
                    if(status){
                        data.newpassword    = await bcrypt.hash(data.newpassword,10);
                        data.cnfpassword    = await bcrypt.hash(data.cnfpassword,10);
                        await db.get().collection(collections.USER_COLLECTION).findOneAndUpdate({_id:ObjectId(userId)},{
                            $set:{
                                password    : data.newpassword,
                                cnfpassword : data.cnfpassword
                            }
                        }).then((data)=>{
                            response.status= true;
                            resolve(response)
                        })
                    }else{
                        console.log(false);
                        response.status = false;
                        resolve(response);
                    }
                });
            }
        })
    },

    getAllCoupons: (id)=>{
        console.log(id)
        return new Promise(async (resolve,reject)=>{
            
            let coupons = await  db.get().collection(collections.USER_COLLECTION).aggregate([
                // Start with a $match pipeline which can take advantage of an index and limit documents processed
                {
                     $match : {
                        _id:ObjectId(id) 
                    }
                },
                { 
                    $unwind : "$coupons" 
                },
                {
                     $project: {
                         "coupons.coupon"       :1,
                         "coupons.couponType"   :1,
                         "coupons.couponDesc"   :1
                     }
                }
            ]).toArray()
            resolve(coupons)
        })
    },

    applyCoupon: (userId,coupon)=>{
        return new Promise(async(resolve,reject)=>{
            let userCoupon = await db.get().collection(collections.USER_COLLECTION).findOne({_id:ObjectId(userId),
                coupons:{
                    $elemMatch:{coupon:coupon}
                }
            })
            let checkCoupon = await db.get().collection(collections.COUPON_COLLECTION).findOne({coupon:coupon,user:ObjectId(userId)})
            let status = {userCoupon,checkCoupon}
            console.log(status.checkCoupon,"this is what coupons looks like");
            if (userCoupon && checkCoupon){
                resolve(status)
            }else{
                reject(status)
            }
        })
    },

    addToWishlist: (id,userId)=>{
        console.log("this is ad to wishlist");
        return new Promise(async (resolve,reject)=>{
            let product     = await db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:ObjectId(id)})
            let wishlist    = await db.get().collection(collections.WISHLIST_COLLECTION).findOne({user:userId})
            let productExist= await db.get().collection(collections.WISHLIST_COLLECTION).findOne({'wishlist._id':ObjectId(id)}) 
            let wishlistObj = {
                user:userId,
                wishlist:[product]
            }
            console.log(userId);
            console.log(wishlist);
            console.log(product);
            if(wishlist){
                if(productExist){
                    resolve()
                }else{
                    db.get().collection(collections.WISHLIST_COLLECTION).updateOne({user:userId},{
                        $push:{
                            wishlist: product
                        }
                    }).then(()=>{
                        resolve()
                    })
                }
            }else{
                db.get().collection(collections.WISHLIST_COLLECTION).insertOne(wishlistObj).then((result)=>{
                    console.log(result.ops[0]);
                    resolve()
                })
            }
        })
    },

    getWishlist: (userId)=>{
        return new Promise(async(resolve,reject)=>{
            let wishlist = await db.get().collection(collections.WISHLIST_COLLECTION).aggregate([
                {
                    $match:{user:userId}
                },
                {
                    $unwind: "$wishlist"
                },
                {
                    $project:{
                        _id:0,
                        user:0
                    }
                }
            ]).toArray()
            resolve(wishlist)
        })
    },

    removeWishlistItem: (id,userId)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.WISHLIST_COLLECTION).updateOne({user:userId},
                {
                    $pull: {
                        wishlist:{_id:ObjectId(id)}
                    }
                }
                ).then(()=>{
                    resolve()
                })
        })
    },

    moveToCart: (proId,userId)=>{
        console.log(proId,userId,"this is move to cart");
        return new Promise(async(resolve,reject)=>{
            let proObj = {
                item: new ObjectId(proId),
                quantity: 1
            }
            let cart = await db.get().collection(collections.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(cart){
                await db.get().collection(collections.CART_COLLECTION).updateOne({user:ObjectId(userId)},{
                    $push:{
                        products:proObj
                    }
                }).then((result1)=>{
                    console.log(result1,"this is forst promise chaiin");
                     db.get().collection(collections.WISHLIST_COLLECTION).updateOne({user:userId},{
                         $pull:{
                             wishlist:{_id:ObjectId(proId)}
                         }
                     })
                     resolve()
                }).catch(()=>{
                    reject()
                })
            }else{
                await db.get().collection(collections.CART_COLLECTION).insertOne({user:ObjectId(userId),products:[proObj]}).then(()=>{
                    db.get().collection(collections.WISHLIST_COLLECTION).updateOne({user:userId},{
                        $pull: {
                            wishlist:{_id:ObjectId(proId)}
                        }
                    })
                    resolve()
                })
            }
            
        })
    }
    

}