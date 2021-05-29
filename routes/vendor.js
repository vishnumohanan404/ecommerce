const { verify } = require('crypto');
const express                  = require('express');
var fs                         = require('fs');
const router                   = express.Router();
const vendorHelper             = require('../helpers/vendor_helper')
const productHelper            = require('../helpers/product_helper');
const { rejects } = require('assert');
const verifyLogin              = (req, res, next) => {
                                 if (req.session.vendorLoggedIn) {
                                  next()
                                 } else {
                                  res.redirect('/vendor/vendor-login')
                                 }
                                 };

/* GET home page. */


// vendor login and signup routes

router.get('/',verifyLogin,async function(req, res, next) {
  let vendor    = req.session.vendor
  let products = await vendorHelper.getAllProducts(vendor._id)
  vendorHelper.getDashboardDetails(vendor._id).then(async(result)=>{
    console.log(result);
    
    console.log(products,"this is products");
    res.render('vendor/vendor-home',{vendor, layout:'vendor-layout.hbs',result,products});
  })
  
});

router.get('/vendor-signup',(req,res)=>{
  if(req.session.vendor){
    res.redirect('/vendor')
  }else{
  res.render('vendor/vendor-signup',{layout:'vendor-layout.hbs',"errorMessage":req.session.vendorExist},);
  req.session.vendorExist=null;
  }
})

router.post('/vendor-signup',async (req,res)=>{
  let status    = await vendorHelper.vendorCheck(req.body)
  if(status){
    console.log("User already exist")
    req.session.vendorExist   = true;
    res.redirect('/vendor/vendor-signup')
  }else{
    vendorHelper.doSignUp(req.body).then((response)=>{
      req.session.vendor         = response;
      req.session.vendorLoggedIn = true;
      res.redirect('/vendor');
    })
  }
   
})

router.get('/vendor-login',(req,res)=>{
  let vendor = req.session.vendorLoggedIn
  
  if(vendor){
    res.redirect('/vendor')
  }else {
    res.render('vendor/vendor-login',{layout:'vendor-layout.hbs',"errorMessage":req.session.vendorLoginError,"blockMessage":req.session.userBlocked });
    req.session.vendorLoginError  = false
    req.session.userBlocked       = null
  }
})

router.post('/vendor-login',(req,res)=>{
  vendorHelper.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.vendor          = response.vendor
      req.session.vendorLoggedIn  = true;
      res.redirect('/vendor/vendor-login');
    }else{
      if (response.userBlocked) {
        req.session.userBlocked = "You are Temporarily Blocked by Admin"
        req.session.vendorLoginError    = false;
        res.redirect('/vendor/vendor-login')
      }else{
        req.session.vendorLoginError    = true;
        res.redirect('/vendor/vendor-login')
        req.session.userBlocked = "You are Temporarily Blocked by Admin"
      }
        
    }
  })
})

router.get('/logout',(req,res)=>{
  req.session.vendor         = null;
  req.session.vendorLoggedIn = false;   
  res.redirect('/vendor');
})


router.get('/vendor-products',verifyLogin,(req,res)=>{
  let vendor    = req.session.vendor
  let edit      = req.session.editStatus
  vendorHelper.getAllProducts(vendor._id).then((result)=>{
    res.render('vendor/vendor-products',{vendor,layout:'vendor-layout.hbs',result,edit});
  })
})

router.get('/add-product',verifyLogin,async (req,res)=>{
  let vendor    = req.session.vendor
  let status    = req.session.addStatus
  await vendorHelper.getAllCategories().then((result)=>{
    res.render('vendor/vendor-add-products',{vendor,layout:'vendor-layout.hbs',result,status});
    req.session.addStatus = null;
  })
})

router.post('/add-product',verifyLogin ,async (req,res)=>{
  let vendor    = req.session.vendor
  let image     = req.body.base64_image;
  let image2     = req.body.base64_image2;
  let image3    = req.body.base64_image3;
  delete req.body.base64_image
  delete req.body.base64_image2
  delete req.body.base64_image3
   await vendorHelper.addProduct(req.body).then((id)=>{
    let data       = image.replace(/^data:image\/\w+;base64,/, '');
    let data2      = image2.replace(/^data:image\/\w+;base64,/, '');
    let data3      = image3.replace(/^data:image\/\w+;base64,/, '');
    const buffer   = Buffer.from(data, "base64");
    const buffer2   = Buffer.from(data2, "base64");
    const buffer3  = Buffer.from(data3, "base64");
    fs.writeFileSync('./public/product-images/'+id+'_image1.jpeg', buffer);
    fs.writeFileSync('./public/product-images/'+id+'_image2.jpeg', buffer2);
    fs.writeFileSync('./public/product-images/'+id+'_image3.jpeg', buffer3);
    req.session.addStatus = "Added successfully"
    res.redirect('/vendor/add-product')
  })
})

router.get('/delete-product/:id', verifyLogin, async (req,res)=>{
  let id= req.params.id
  await vendorHelper.deleteProduct(req.params.id).then(()=>{
    let path  = './public/product-images/'+id+'_image1.jpeg'
    let path2 = './public/product-images/'+id+'_image2.jpeg'
    let path3 = './public/product-images/'+id+'_image3.jpeg'
    //in future try to use array.map instead of this method 
     fs.unlink(path, (err) => {
      if (err) {
        console.error(err)
        return
      }else{
        fs.unlink(path2, (err) => {
          if (err) {
            console.error(err)
            return
          }else{
            fs.unlink(path3, (err) => {
            if (err) {
              console.error(err)
              return
            }else{
              res.redirect('/vendor/vendor-products');
            }
          })
          }
        })
      }
    })
    })
})

router.get('/edit-product/:id',verifyLogin,async (req,res)=>{
  const imageToBase64          = require('image-to-base64');
  let vendor    = req.session.vendor;
  let product   = req.params.id
  let status    = req.session.editStatus
  let imageB64  = null;
  let imageB642 = null
  let imageB643 = null
  let image1  =  './public/product-images/'+product+'_image1.jpeg'
  let image2  =  './public/product-images/'+product+'_image2.jpeg'
  let image3  =  './public/product-images/'+product+'_image3.jpeg'
  // image to base64 
  if(fs.existsSync(image1) && fs.existsSync(image2) && fs.existsSync(image3) ){
    console.log("image");
    imageToBase64('./public/product-images/'+product+'_image1.jpeg') // Path to the image
    .then(
        (response) => {
          console.log("succes");
           imageB64= response // "cGF0aC90by9maWxlLmpwZw=="
        }
    )
    .catch(
        (error) => {
          console.log("fail");
            console.log(error); // Logs an error if there was one
        }
    )
    // base64 2
    imageToBase64(image2) // Path to the image
    .then(
        (response) => {
          console.log("succes");
           imageB642= response // "cGF0aC90by9maWxlLmpwZw=="
        }
    )
    .catch(
        (error) => {
          console.log("fail");
            console.log(error); // Logs an error if there was one
        }
    )
    // base64 3
    imageToBase64(image3) // Path to the image
    .then(
        (response) => {
          console.log("succes");
           imageB643= response // "cGF0aC90by9maWxlLmpwZw=="
        }
    )
    .catch(
        (error) => {
          console.log("fail");
            console.log(error); // Logs an error if there was one
        }
    )
  }
  // image to base64
  await vendorHelper.getAllCategories().then((categories)=>{
    productHelper.getProductDetails(product).then((result)=>{
      res.render('vendor/edit-product',{vendor,layout:"vendor-layout.hbs",product,result,categories,status,imageB64,imageB642,imageB643})
      req.session.editStatus =  null
    })
  })
  
})

router.post('/edit-product/:id',verifyLogin,(req,res)=>{
  let vendor  = req.session.vendor;
  let id      = req.params.id
  req.body.price= parseFloat(req.body.price)
  let body    = req.body
  let image     = req.body.base64_image;
  let image2     = req.body.base64_image2;
  let image3    = req.body.base64_image3;
  delete req.body.base64_image
  delete req.body.base64_image2
  delete req.body.base64_image3
  productHelper.updateProduct(id,body).then(()=>{
    let data      = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, "base64");
    fs.writeFileSync('./public/product-images/'+id+'_image1.jpeg', buffer);
    if( image2 && image3){
      console.log("super hero");
      let data2      = image2.replace(/^data:image\/\w+;base64,/, '');
      let data3      = image3.replace(/^data:image\/\w+;base64,/, '');
      const buffer2   = Buffer.from(data2, "base64");
      const buffer3  = Buffer.from(data3, "base64");
      fs.writeFileSync('./public/product-images/'+id+'_image2.jpeg', buffer2);
      fs.writeFileSync('./public/product-images/'+id+'_image3.jpeg', buffer3);
    }
    req.session.editStatus = "Edited successfully"
    res.redirect('/vendor/edit-product/'+id)
  })
})

router.get('/view-product/:id',verifyLogin,async(req,res)=>{
  let vendor  = req.session.vendor
  await productHelper.getProductDetails(req.params.id).then((result)=>{
    res.render('vendor/vendor-product-details',{vendor,layout:"vendor-layout.hbs",result})
  })
})

router.get('/orders',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor;
  console.log(vendor);
  vendorHelper.getOrdersForVendors(vendor._id).then((orders)=>{
    console.log(orders);
    res.render('vendor/vendor-orders',{vendor,layout:"vendor-layout.hbs",orders,shipped:"Shipped",delivered:"Delivered"});
  })
})

router.post('/ship-product',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor;
  console.log("this is the body inside ship products",req.body)
  vendorHelper.shipProduct(req.body.userId,req.body.orderId,req.body.productId).then(()=>{
    res.json({shipped:true});
  })
})

router.post('/deliver-product',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor;
  console.log("this is the body inside ship products",req.body)
  vendorHelper.deliverProduct(req.body.userId,req.body.orderId,req.body.productId).then(()=>{
    productHelper.updateStocks(req.body.productId,req.body.quantity).then(()=>{
      res.json({delivered:true});
    })
  })
})

router.get('/view-order-details/:id/:proId',verifyLogin,async(req,res)=>{
  let vendor  = req.session.vendor
  console.log(req.params.proId);
  await vendorHelper.getOrderDetails(req.params.id,vendor._id,req.params.proId).then((result)=>{
    console.log(result);
    res.render('vendor/vendor-order-details',{vendor,layout:"vendor-layout.hbs",result})
  })
})

router.get('/get-discount',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor;
  let proId  = req.query.id
  console.log(req.query.id,"hello");
  vendorHelper.getDiscount(proId).then((result)=>{
    console.log(result);
    res.json(result)
  }).catch(()=>{
    res.json({discount:false})
  })
})

router.post('/post-discount',verifyLogin,(req,res)=>{
  let vendor =req.session.vendor;
  console.log(req.body);
  let result = 1- (parseInt(req.body.offer)/100);
  console.log(result);
  vendorHelper.postDiscount(req.body.productid,result,req.body.offer).then(()=>{
    console.log("hello");
    res.redirect('/vendor/vendor-products')
  }).catch(()=>{
    res.json({status:false})
  })
})

router.get('/offers',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor;
  vendorHelper.getOfferProducts(vendor._id).then((result)=>{
    console.log(result);
    res.render('vendor/vendor-products-discounts',{layout:"vendor-layout.hbs",vendor,result})
  })
})

router.post('/remove-offer',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor
  console.log(req.body);
  vendorHelper.removeOffer(req.body.id).then((status)=>{
    console.log(status);
    res.json({status})
  })
})

router.get('/reports',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor;
  res.render('vendor/vendor-reports', {layout:'vendor-layout.hbs',vendor})
})

router.get('/product-report',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor 
  vendorHelper.getAllProducts(vendor._id).then((products)=>{
    res.render('vendor/product-report',{vendor,layout:'vendor-layout.hbs',products})
  })
})

router.get('/order-report',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor
  vendorHelper.getOrdersForVendors(vendor._id).then((orders)=>{
    console.log(orders);
    res.render('vendor/order-reports',{layout:"vendor-layout.hbs",orders,vendor})
  })
})

router.get('/customer-report',verifyLogin,(req,res)=>{
  let vendor = req.session.vendor
  vendorHelper.getCustomers(vendor._id).then((customers)=>{
    console.log(customers);
    res.render('vendor/customer-report',{layout:"vendor-layout.hbs",customers,vendor})
  })
})




module.exports = router
