const db                = require('../config/connection');
const collections       = require('../config/collections');
const bcrypt            = require('bcrypt');
const ObjectId          = require('mongodb').ObjectID;
const { response }      = require('express');
const env               = require('dotenv').config();


// modules to export 

module.exports={

    getAllProducts: ()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).find({stocks:{$gt: 1}}).toArray()
            resolve(products)
        })
    },
    getAllProductsForList: ()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).aggregate([{$project:{
                _id:1,
                productname:1
            }}]).toArray()
            resolve(products)
        })
    },

    getAllCatProducts: (category)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(category);
            let products = await db.get().collection(collections.PRODUCT_COLLECTION).find({category:category,stocks:{$gt: 1}}).toArray()
            resolve(products)
        })
    },

    getRandomProducts: ()=>{
        return new Promise(async(resolve,reject)=>{
            let random = await db.get().collection(collections.PRODUCT_COLLECTION).aggregate([{$sample: {size: 4}}]).toArray();
            resolve(random)
        })
    }, 
    
    getAllCategories: ()=>{
        return new Promise(async(resolve,reject)=>{
            let categories = await db.get().collection(collections.CATEGORY_COLLECTION).find({}).toArray()
            if(categories){
                resolve(categories)
            }else{
                reject()
            }
        })
    },

    getProductDetails: (id)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.PRODUCT_COLLECTION).findOne({_id:ObjectId(id)}).then((result)=>{
                resolve(result)
            })
        })
    },

    updateProduct: (id,body)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(id)},{
                $set:{
                    productname:    body.productname,
                    description:    body.description,
                    price:          body.price,
                    stocks:         body.stocks,
                    category:       body.category,
                    actualPrice:    body.price
                }
            }).then((result)=>{
                resolve()
            })
        })
    },

    updateStocks: (proId,Qty)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collections.PRODUCT_COLLECTION).updateOne({_id:ObjectId(proId)},{$inc:{stocks:-Qty}}).then(()=>{
                resolve()
            })
        })
    }
}