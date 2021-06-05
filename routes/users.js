const express                = require('express');
const { serializeUser }      = require('passport');
const userHelper             = require('../helpers/user_helper');
const productHelper          = require('../helpers/product_helper');
const router                 = express.Router();
const queryString            = require('query-string');
const { response }           = require('express');
const env                    = require('dotenv').config();
const accountSid             = process.env.TWILIO_ACCOUNT_SID;
const authToken              = process.env.TWILIO_AUTH_TOKEN;
const serviceId              = process.env.TWILIO_SERVICE_ID;
const twilio                 = require('twilio')(accountSid, authToken);
const fs                     = require('fs')
const jsonUtils              = require('../public/javascript/json_utils')     
const imageToBase64          = require('image-to-base64');
const passport               = require('passport')
const verifyLogin            = (req, res, next) => {
                                 if (req.session.userLoggedIn) {
                                  next()
                                 } else {
                                  
                                  res.redirect('/login')
                                  res.json({status:false})
                                 }
                               };
const categoriesGet          = (req,res,next)=>{
                                  productHelper.getAllCategories().then((result)=>{
                                    categories = result
                                    next()
                                  })
                               }                             
let productsLists        = (req,res,next)=>{
                                  productHelper.getAllProductsForList().then((result)=>{
                                    productsList = result
                                    next()
                                  })
                               }
                      




// home 

router.get('/',categoriesGet,productsLists,async function(req, res, next) {
  let user = req.session.user
  let list
  // function to change product list
    list =productsList.map(x =>x.productname)
  // 
  cartCount=null
  if (user) {
    cartCount = await userHelper.getCartCount(user._id);
  }
  productHelper.getRandomProducts().then((random)=>{
    products = random
    res.render('user/home-page', {user,categories,products,cartCount,'data': list,productsList});
  })
});



// login and logout routes

router.get('/login',productsLists,categoriesGet,(req,res)=>{
  let user = req.session.user
  if(user){
    res.redirect('/')
  }else{
      res.render('user/login',{"loginError" : req.session.userLoginError,"oauth":req.session.userOauth,"blockMessage":req.session.userBlocked,categories,productsList});
      req.session.userBlocked = null;
      req.session.userLoginError = null;
      req.session.userOauth = null
  }
})

router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user            = response.user
      req.session.userLoggedIn    = true
      res.redirect('/')
    }else{
      if(response.userBlocked){
        console.log("user is Blocked");
        req.session.userBlocked       = "You are temporarily blocked"
        res.redirect('/login')
      }else if(response.userOauth){
        console.log("invalid password");
        req.session.userOauth    = "This user don't have a password"
        res.redirect('/login')
      } else{
        console.log("invalid password");
        req.session.userLoginError    = "Invalid username or password"
        res.redirect('/login')
      }
      
    }
  })
})

router.get('/logout',(req,res)=>{
  req.session.user          = null;
  req.session.userLoggedIn  = false;
  res.redirect('/')
})

router.get('/otp-register-form',productsLists,categoriesGet,(req,res)=>{
  let user = req.session.user
  if(!user){
    res.render('user/otp-register',{user,"loginError" : req.session.userLoginError,categories,productsList})
  }else{
    res.redirect('/')
  }
})

router.post('/verify-otp-register',categoriesGet,async(req,res)=>{
  console.log("routes");
  let user   = req.session.user
  let phone  = req.body.mobile
  let email  = req.body.email
  console.log(email,phone);
  userHelper.verifyOtpRegister(email,phone).then(()=>{
    twilio.verify.services(serviceId)
        .verifications
        .create({to: `+91${phone}`, channel: 'sms'})
        .then(verification =>{
          console.log(verification)
          res.json({status:true,"email":email,mobile:phone}) 
        })
        .catch(()=>{
          res.json({status:false,error:true})
          console.log("verification failed");
        })
  })
  .catch(()=>{
    res.json({status:false})
  })
})



router.post('/otp-register-submit',categoriesGet,async(req,res)=>{
  let user   = req.session.user
  let email  = req.body.email
  let mobile = req.body.mobile
  let otp    = req.body.otp
  console.log(req.body)
  twilio.verify.services(serviceId)
      .verificationChecks
      .create({ to: `+91${mobile}`, code: otp})
      .then((verification_check) => {
        if(verification_check.status==="approved"){
          console.log(verification_check)
            userHelper.otpRegistration(email,mobile).then(response=>{
            console.log(response.user);
            req.session.user            = response.user
            req.session.userLoggedIn    = true
            res.json({status:true,user:req.session.user})
          })
        }else{
          res.json({status:false})
        }
      })
      .catch(()=>{
        res.json({status:false})
      })
  
})

router.get('/otp-login',productsLists,categoriesGet,(req,res)=>{
  let user = req.session.user
  if(!user){
    res.render('user/otp-login',{user,"loginError" : req.session.userLoginError,categories,productsList})
  }else{
    res.redirect('/')
  }
})

router.post('/verify-otp-login',categoriesGet,async(req,res)=>{
  console.log("routes");
  let user   = req.session.user
  let phone  = req.body.mobile
  await userHelper.verifyOtpLogin(phone).then(()=>{
    twilio.verify.services(serviceId)
        .verifications
        .create({to: `+91${phone}`, channel: 'sms'})
        .then(verification =>{
          console.log(verification.status)
          res.json({status:true,mobile:phone}) 
        })
        .catch(()=>{
          console.log("verification failed");
        })
  })
  .catch(()=>{
    res.json({status:false})
  })
})

router.post('/otp-login-submit',categoriesGet,async (req,res)=>{
  let mobile = req.body.mobile
  let otp    = req.body.otp
  console.log(req.body)
  twilio.verify.services(serviceId)
      .verificationChecks
      .create({ to: `+91${mobile}`, code: otp})
      .then((verification_check) => {
        console.log(verification_check)
        if(verification_check.status==="approved"){
          userHelper.otpLogin(mobile).then(response=>{
            console.log(response.user);
              req.session.user            = response.user
              req.session.userLoggedIn    = true
              res.json({status:true,user:req.session.user})
          })
          console.log('otp correct')
        }else{
          console.log('otp failed');
          res.json({status:false})
        }
      })
      .catch(()=>{
        res.json({status:false})
      })
  
})

// signup routes

router.get('/signup',productsLists,categoriesGet,(req,res)=>{
  let user = req.session.user
  if(user){
    res.redirect('/')
  }else{
    res.render('user/signup',{"errorMessage":req.session.userExist,categories,productsList});
    req.session.userExist=null;
  }
})

router.post('/signup',async (req,res)=>{
  let status   = await userHelper.userCheck(req.body)
  if(status){
    req.session.userExist = "User Already Exist"
    res.redirect('/signup')
  }else{
    userHelper.doSignUp(req.body).then((response)=>{
      console.log(response,"hello response");
      req.session.user         = response;
      req.session.userLoggedIn = true;
      res.redirect('/');
    })
  }
})

router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account'
}));

router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    let user = req.user
    userHelper.googleAuth(user).then((response)=>{
      req.session.user = response
      console.log(response,"this is our response object");
      req.session.userLoggedIn = true;
      res.redirect('/');
    })
  }
);

// product routes

router.get('/all-products',productsLists,categoriesGet,async(req,res)=>{
  let user   = req.session.user
 
  await productHelper.getAllProducts().then((products)=>{
    let length = products.length 
    res.render('user/all-products',{user,products,length,categories,productsList});
  })
})

router.get('/product-details/',productsLists,categoriesGet,async(req,res)=>{
  let id   = req.query.id
  await productHelper.getProductDetails(id).then((result)=>{
    let user = req.session.user;
    res.render('user/product-details',{user,categories,result,productsList});
  })
})

router.get('/all-products/:category',productsLists,categoriesGet,async(req,res)=>{
  let user   = req.session.user
  let category = req.params.category
  await productHelper.getAllCatProducts(category).then((products)=>{
    let length = products.length 
    res.render('user/all-products',{user,products,length,categories,productsList});
  })
})

// cart routes

router.get('/cart',productsLists,categoriesGet,verifyLogin,(req,res)=>{
  let user        = req.session.user
  let subtotal    = 0
  let total       = 0
  let cartlength  = 0
  console.log("hello");
  userHelper.getCart(user._id).then(async(cart)=>{
    cartlength=cart.length
    if(cart.length>0){
      console.log(cart)
      total   = Math.abs(await userHelper.getTotal(req.session.user._id)) 
      subtotal     = Math.abs(await userHelper.getSubtotal(req.session.user._id)) 
      res.render('user/user-cart', {user,categories,cart,cartlength,subtotal,total,productsList});
    }else{
      console.log(cart)
      res.render('user/user-cart', {user,categories,'cart':false,subtotal,total,productsList});
    }
    
  })
  
})


router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{
  let id    = req.params.id
  let userId  = req.session.user._id
  let count   = parseInt(req.query.count)
  console.log(req.params,req.query,"params is a good boy");
      userHelper.addToCart(id,userId,count).then(()=>{
        res.json({status:true})
      })
})


router.post('/change-quantity',verifyLogin,(req,res)=>{
  console.log("mango tree in the ground")
  let subtotal 
  userHelper.changeQuantity(req.body).then(async(response)=>{
    if(!response.removeProduct){
      response.total    = Math.abs(await userHelper.getTotalAfterQuantityChange(req.session.user._id)) 
      response.subtotal = Math.abs(await userHelper.getSubtotal(req.body.user)) 
      response.subtotal = parseFloat(response.subtotal)
      response.total    = parseFloat(response.total)
      subtotal = parseFloat(response.subtotal)
      console.log(subtotal); 
    }
    console.log(response,"this is response");
    res.json(response);
  })
})

router.get('/delete-cart-product',async(req,res)=>{
  console.log(req.query.item_id)
  console.log(req.query.cart_id)
  await userHelper.deleteCartItem(req.query.item_id,req.query.cart_id).then((result)=>{
    res.redirect('/cart');
  })
})

router.get('/checkout',productsLists,categoriesGet,verifyLogin,async(req,res)=>{
  let user       = req.session.user;
  let cartId     = req.query.cart_id
  let discount   = false
  console.log(req.query.cart_id,req.query.subtotal);
  userHelper.getCart(cartId).then(async(cart)=>{
    console.log(cart,"this is cart from getCart")
    if(cart.length>0){
      let subtotal   = parseFloat(await userHelper.getSubtotal(req.session.user._id))
      console.log(subtotal);
      let address    = await userHelper.getAddress(user._id)
      for(var i=0; i<cart.length;i++){
        if(cart[i].product.discount || cart[i].product.catOff){
          discount = true;
          break;
        }
      }
      res.render('user/checkout',{user,categories,cart,subtotal,address,categories,discount,productsList});
    }else{
      res.redirect('/');
    }
  }).catch(()=>{
    res.redirect('/')
  })
})

router.post('/checkout',categoriesGet,verifyLogin,async(req,res)=>{
  let user     = req.session.user;
  let subtotal     = parseFloat(await userHelper.getSubtotal(user._id))
  console.log(req.body, "this is the checkout body")
  if(req.body.saveAddress){
    userHelper.userAddressAdd(user._id,req.body).then(()=>{
      console.log("Address saved");
    })
  }
  userHelper.getCart(user._id).then((cart)=>{
    console.log(cart);
    cart.status=null
    if(req.body.couponApplied ==='WEL'){
      subtotal = subtotal -200
      var coupon={
        couponApplied : true,
        couponType    : 'WEL',
        couponCode    : req.body.couponCode
      }
    }else if(req.body.couponApplied ==='ADM'){
            subtotal = parseInt(req.body.subtotal) 
             var coupon={
               couponApplied : true,
               couponType    : 'ADM',
               couponCode    : req.body.couponCode
             }
           }else if(req.body.couponApplied ==='FST'){
                subtotal = parseInt(req.body.subtotal) 
                var coupon={
                   couponApplied : true,
                   couponType    : 'FST',
                   couponCode    : req.body.couponCode
                 }
              }
              else{
                  var coupon = {
                  couponApplied : false
                  } 
              }
    userHelper.placeOrder(req.body,user,cart,coupon,subtotal).then((orderId)=>{
      req.session.orderId = orderId
      console.log(req.body, "this is body chekout");
      if(req.body.selector==="rp"){
        userHelper.generateRazorpayOrder(orderId,subtotal).then((response)=>{
          response.username = user.firstname +" "+ user.lastname
          response.email    = user.email
          response.phone    = user.phone
          console.log(response,"response from userhelper")
          res.json(response)
        })
      }else if(req.body.selector==="pp"){
        val = subtotal / 72
        console.log(val)
        subtotal = val.toFixed(2)
        response.total = subtotal
        response.paypal = true
        res.json(response)
      }else{
        console.log(orderId);
        res.json({codSuccess:true,order:orderId})
      }
    })
  })
})

router.post('/verify-payment',(req,res)=>{
  let user = req.session.user;
  console.log(req.body)
  userHelper.verifyPaymentSignature(req.body).then(()=>{
    userHelper.updateOrderStatus(req.body['order[receipt]'],user._id).then(()=>{
      console.log("Here i come in orderupdateSucces")
      res.json({status:true})
    })
  }).catch(()=>{
    res.json({status:false})
  })
})

router.post('/paypal-status-change', (req, res) => {
  userHelper.updateOrderStatus(req.session.orderId, req.session.user._id).then((response) => {
    res.json({ status: true })
  }).catch((err) => {
    res.json({ status: false })
  })
})

router.get('/order-success',productsLists,verifyLogin,categoriesGet,async(req,res)=>{
  let user    = req.session.user
  let orderId = req.session.orderId
  console.log(orderId);
  userHelper.getSingleOrderDetails(orderId).then((orderDetails)=>{
    console.log(orderDetails,"orderSucces get router is triggering the getSingleOrderDetails function")
    res.render('user/order-success',{user,categories,orderDetails,cart:orderDetails.cart,productsList})
  })
})


router.get('/orders',productsLists,categoriesGet,verifyLogin,(req,res)=>{
  let user    = req.session.user;
  let pending = false;
  userHelper.getOrdersForUsers(user._id).then((orders)=>{
    console.log(orders,"orders are here in orders routes")
    res.render('user/orders', {user,categories,'orders':orders,productsList});
  }).catch(()=>{
    res.redirect('/')
  })
})

router.get('/order-details/:id',productsLists,categoriesGet,verifyLogin,async(req,res)=>{
  let user = req.session.user
  let orderId = req.params.id
  await userHelper.getOrderDetails(orderId).then((orders)=>{
    console.log(orders,"orders in order-details")
    res.render('user/order-details', {user,categories,orders,cart:orders.cart,productsList});
  }).catch(()=>{
    res.redirect('/')
  })
})

router.get('/cancel-order/:id',categoriesGet,verifyLogin,(req,res)=>{
  let user = req.session.user
  let orderId   = req.params.id
  userHelper.cancelOrder(orderId).then(()=>{
    res.redirect('/orders');
  })
})

router.get('/profile',productsLists,verifyLogin,categoriesGet,(req,res)=>{
  console.log("profile");
  let id = req.session.user._id
  let imageExist = false
  let path = './public/profile-pictures/'+id+'.jpeg'
  if (fs.existsSync(path)) {
    console.log("image exists");
     imageExist = true;
  }
  let user = req.session.user
  console.log(user,"this is user._id");
  userHelper.getUserDetail(user._id).then((userDetails)=>{
    console.log(userDetails,"this is userDetails")
    res.render('user/view-profile',{user,userDetails,categories,"profileEditStatus":req.session.profileEditStatus,imageExist,productsList});
    req.session.profileEditStatus = null
  })
})

router.get('/edit-profile',productsLists,verifyLogin,categoriesGet,(req,res)=>{
  let user = req.session.user
  let id = req.session.user._id
  var imageExist = false
  let imageB64 = null;
  // this is base64 to image
 
  // 
  let path = './public/profile-pictures/'+id+'.jpeg'
  if (fs.existsSync(path)) {
    console.log("image exists");
     imageExist = true;
     imageToBase64('./public/profile-pictures/'+id+'.jpeg') // Path to the image
     .then(
         (response) => {
            imageB64= response // "cGF0aC90by9maWxlLmpwZw=="
         }
     )
     .catch(
         (error) => {
             console.log(error); // Logs an error if there was one
         }
     )
  }
  userHelper.getUserDetail(user._id).then((userDetails)=>{
    console.log(userDetails,"this is userDetails")
    res.render('user/edit-profile',{user,userDetails,categories,imageExist,imageB64,productsList});
  })
})

router.post('/edit-profile',verifyLogin,categoriesGet,(req,res)=>{
  let user = req.session.user
  let id = req.session.user._id
  console.log(id,"this is id");
  let image     = req.body.base64_image;
  req.session.base64_image = image
  delete req.body.base64_image
  userHelper.editUser(user._id,req.body).then(()=>{
    if(image){
      let data       = image.replace(/^data:image\/\w+;base64,/, '');
      const buffer   = Buffer.from(data, "base64");
      fs.writeFileSync('./public/profile-pictures/'+id+'.jpeg', buffer);
    }
    req.session.profileEditStatus = "Profile Edited successfully"
    res.redirect('/profile');
  })
})

router.post('/delete-profile-picture',verifyLogin,(req,res)=>{
  console.log(req.body);
 let path = './public/profile-pictures/'+req.body.id+'.jpeg'
 console.log(path);
 fs.unlink(path, (err) => {
  if (err) {
    console.error(err)
    console.log("image not deleted");
    return
  }else{
    console.log("image deleted");
    res.json({status:true})
  }
  //file removed
})
})

router.get('/change-password',productsLists,verifyLogin,categoriesGet,(req,res)=>{
  let user = req.session.user
  res.render('user/change-password',{user,categories,"passwordError" : req.session.userPasswordError,productsList})
  req.session.userPasswordError = null
})

router.post('/change-password',verifyLogin,categoriesGet,(req,res)=>{
  let user = req.session.user
  userHelper.changePassword(user._id,req.body).then((response)=>{
    if(response.status){
      res.redirect('/edit-profile');
    }else{
      req.session.userPasswordError    = "Invalid password"
      res.redirect('/change-password')
    }
  })
})

router.get('/manage-address',productsLists,verifyLogin,categoriesGet,async (req,res)=>{
  let user = req.session.user
   await userHelper.getAddress(user._id).then((address)=>{
    res.render('user/manage-address',{user,categories,address,productsList})
  })
})

router.post('/add-address',verifyLogin,categoriesGet,(req,res)=>{
  let user  = req.session.user
  console.log(req.body,"post address add")
  userHelper.userAddressAdd(user._id,req.body).then((response)=>{
    console.log("Address saved");
    res.json({status:true})
  })
})

router.post('/remove-address',verifyLogin,(req,res)=>{
  let user = req.session.user
  console.log(req.body.addressId)
  userHelper.removeAddress(user._id,req.body.addressId).then(()=>{
    console.log("helloooo Mannn")
    res.json({status:true})
  })
})

router.get('/coupons',productsLists,verifyLogin,(req,res)=>{
  let user = req.session.user
  userHelper.getAllCoupons(user._id).then((coupons)=>{
    res.render('user/all-coupons',{user,coupons,productsList})
  })
})

router.get('/applycoupon',verifyLogin,(req,res)=>{
  let user = req.session.user
  let coupon = req.query.coupon
  console.log(coupon);
  userHelper.applyCoupon(user._id,coupon).then((status)=>{
    console.log(status);
    res.json({status})
  }).catch((status)=>{
    console.log(status);
    res.json({status:false})
  })
})

router.get('/repeat-order',categoriesGet,verifyLogin,(req,res)=>{

})


router.get('/wishlist',productsLists,categoriesGet,verifyLogin,async(req,res)=>{
  let user = req.session.user
  await userHelper.getWishlist(user._id).then((wishlist)=>{
    res.render('user/wishlist', {user,categories,wishlist,productsList});
  })
})

router.get('/add-to-wishlist/:id',verifyLogin,(req,res)=>{
  userHelper.addToWishlist(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.get('/remove-wishlist-item/:id',verifyLogin,(req,res)=>{
  console.log(req.params.id)
  userHelper.removeWishlistItem(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})

router.get('/move-to-cart/:id',verifyLogin,(req,res)=>{
  let proId = req.params.id
  let user  = req.session.user._id
  console.log(proId);
  userHelper.moveToCart(proId,user).then(()=>{
    res.json({status:true})
  })
})




module.exports = router;
