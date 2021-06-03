var express                    = require('express');
const { dashboardDetails } = require('../helpers/admin_helper');
var router                     = express.Router();
const adminHelper              = require('../helpers/admin_helper');
const userHelper               = require('../helpers/user_helper');
const vendorHelper             = require('../helpers/vendor_helper');
const moment                   = require('moment');
const random                   = require('random-key-generator')
const verifyLogin              = (req, res, next) => {
                                 if (req.session.adminLoggedIn) {
                                  next()
                                 } else {
                                  res.redirect('/admin/admin-login')
                                 }
                                 };

/* GET home page. */
router.get('/',verifyLogin,(req, res, next)=> {
  let admin = req.session.admin
  adminHelper.getDashboardDetails().then((response)=>{
    let categoryDetails = response.categoryDetails
    let orderDetails    = response.orderDetails
    let revenueData     = response.revenueData
    // date is a Date object you got, e.g. from MongoDB
    console.log(response.orderDetails);
    const map1 = orderDetails.map((orderDetails) =>orderDetails.date = moment(orderDetails.date).format("DD/MM/YY"));
    console.log(response.revenueData,"revenue data");
    console.log(map1);
    res.render('admin/admin-home',{admin,layout:'admin-layout.hbs',response,categoryDetails,orderDetails,revenueData,map1});
  })
});

router.get('/admin-login',(req,res)=>{
  let admin     = req.session.admin
  if(admin){
    res.redirect('/admin')
  }else{
    res.render('admin/admin-login',{layout:"admin-layout.hbs","errorMessage":req.session.adminLoginError});
    req.session.adminLoginError = false
  }
})

router.post('/admin-login',(req,res)=>{
  adminHelper.doLogin(req.body).then((response)=>{
    
    if(response.status){
      req.session.admin         = response.admin
      req.session.adminLoggedIn = true;
      res.redirect('/admin')
    }else{
      req.session.adminLoginError = true;
      res.redirect('/admin')
    }
  })
})

router.get('/admin-signup',(req,res)=>{
  if(req.session.admin){
    res.redirect('/admin');
  }else{
  res.render('admin/admin-signup',{layout:"admin-layout.hbs"})
  }
})

router.post('/admin-signup',(req,res)=>{
  adminHelper.doSignUp(req.body).then((response)=>{
    req.session.admin = response;
    req.session.adminLoggedIn = true;
    res.redirect('/admin');
  })
})

router.get('/logout',(req,res)=>{
  req.session.admin         = null;
  req.session.adminLoggedIn = false;
  res.redirect('/admin')
})

router.get('/category',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  adminHelper.getCategories().then((objects)=>{
    res.render('admin/category',{layout:"admin-layout.hbs",admin,objects})
  })
})

router.get('/add-category',verifyLogin,(req,res)=>{
  let admin   = req.session.admin 
  let status  = req.session.categorySuccess
  res.render('admin/add-category',{layout:"admin-layout.hbs", admin, status})
  req.session.categorySuccess = null
})

router.post('/add-category',verifyLogin,(req,res)=>{
  adminHelper.addCategory(req.body).then((status)=>{
    if(status){
      req.session.categorySuccess = "New Category Added Successfully";
      res.redirect('/admin/add-category')
    }else{
      req.session.categorySuccess = "Category Already exists"
      res.redirect('/admin/add-category')
    }
  })
})

router.get('/delete-category/:id',verifyLogin,(req,res)=>{
  adminHelper.deleteCategory(req.params.id).then((status)=>{
    res.redirect('/admin/category')
  })
})

router.get('/users',verifyLogin,(req,res)=>{
  let admin = req.session.admin;
  adminHelper.getAllUsers().then((result)=>{
    let users= result
   
    res.render('admin/users',{layout:"admin-layout.hbs",admin,users})
  })
})

router.get('/view-user/:id',verifyLogin,(req,res)=>{
  let admin = req.session.admin;
  console.log("hellooooooo");
  adminHelper.getUserDetails(req.params.id).then((user)=>{
    console.log(user,"this is user");
    res.render('admin/user-details',{admin,layout:"admin-layout.hbs",user})
  })
})

router.get('/add-user',verifyLogin,(req,res)=>{
  let admin  = req.session.admin;
  let status = req.session.userStatus
  console.log("hello your nodemon is fine")
  res.render('admin/add-user',{layout:"admin-layout.hbs",admin,status})
  req.session.userStatus = null;
})

router.post('/add-user',verifyLogin,async (req,res)=>{
  let status   = await userHelper.userCheck(req.body)
  if(status){
    req.session.userStatus = "User Already Exist"
    res.redirect('/admin/add-user')
  }else{
    userHelper.doSignUp(req.body).then((response)=>{
      req.session.user         = response;
      req.session.userLoggedIn = true;
      req.session.userStatus = "New User Added Succesfully"
      res.redirect('/admin/add-user');
    })
  }
})

router.get('/vendors',verifyLogin,(req,res)=>{
  let admin = req.session.admin;
  adminHelper.getAllVendors().then((vendors)=>{
    res.render('admin/vendors',{layout:"admin-layout.hbs",admin,vendors})
  })
})

router.get('/add-vendor',verifyLogin,(req,res)=>{
  let admin  = req.session.admin;
  let status = req.session.vendorStatus;
  res.render('admin/add-vendor',{layout:"admin-layout.hbs",admin,status})
  req.session.vendorStatus=null;
})

router.post('/add-vendor',verifyLogin,async(req,res)=>{
  let status    = await vendorHelper.vendorCheck(req.body);
  if(status){
    req.session.vendorStatus   = "Vendor Already Exist";
    res.redirect('/admin/add-vendor');
  }else{
    vendorHelper.doSignUp(req.body).then((response)=>{
      req.session.vendorStatus = "Vendor Added Successfully";
      res.redirect('/admin/add-vendor');
    })
  }
})

router.get('/block-vendor/:id',verifyLogin,async(req,res)=>{
  console.log("hello");
  await adminHelper.blockVendor(req.params.id).then(()=>{
    res.redirect('/admin/vendors')
  })
})

router.get('/unblock-vendor/:id',verifyLogin,async(req,res)=>{
  await adminHelper.unblockVendor(req.params.id).then(()=>{
    res.redirect('/admin/vendors')
  })
})

router.get('/view-vendor/:id',verifyLogin,async(req,res)=>{
  let admin     = req.session.admin
  let products  = await adminHelper.getVendorProducts(req.params.id)
  console.log(products);
  adminHelper.getVendorDetails(req.params.id).then(async(result)=>{
    await adminHelper.getVendorOrderDetails(req.params.id).then((response)=>{
      console.log(response.orders,"orders");
      console.log(response.shipped,"shipped");
      console.log(response.delivered,"delivered");
      console.log(response.cancelled,"cancelled");
      console.log(response.products,"pro");
      if(result.block==1){
        status = "Blocked"
      }else{
        status = "Active"
      }
      res.render('admin/vendor-details',{layout:"admin-layout.hbs",admin,result,status,response,products})
    })
  })
})

router.get('/view-product/:id',verifyLogin,(req,res)=>{
  console.log("this is the best oute");
  let admin   = req.session.admin
  let proId  = req.params.id
  adminHelper.getVendorProductDetails(proId).then((result)=>{
    console.log(result,"this is result");
    res.render('admin/vendor-product-details',{layout:'admin-layout.hbs',admin,result})
  })
})

router.get('/get-offer',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  console.log(req.query,"this is body");
  adminHelper.getCategoryOffer(req.query.id).then((result)=>{
    console.log(result.offer,"result in get");
    res.json(result)
  }).catch(()=>{
    res.json({offer:false})
  })
})

router.post('/post-offer',verifyLogin,(req,res)=>{
  console.log(req.body,'body of post');
  let result = 1- (parseInt(req.body.offer)/100);
  console.log(result, "result");
  adminHelper.postOffer(req.body.offer,result,req.body.categoryid,req.body.categoryname).then((result)=>{
    res.redirect('/admin/category')
  })
})

router.post('/remove-offer',verifyLogin,(req,res)=>{
  console.log(req.body);
    adminHelper.deleteCategoryOffer(req.body.catId,req.body.catName).then(()=>{
      res.json({status:true})
    }).catch(()=>{
      res.json({status:false})
    })
})

router.get('/reports',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  res.render('admin/reports',{layout:"admin-layout.hbs",admin})
})

router.get('/order-report',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  adminHelper.getOrderReport().then((orders)=>{
    console.log(orders);
    res.render('admin/order-report',{layout:"admin-layout.hbs",admin,orders})
  })
})

router.get('/user-report',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  adminHelper.getUserReport().then((users)=>{
    console.log(users);
    res.render('admin/user-report',{layout:"admin-layout.hbs",admin,users})
  })
})

router.get('/vendor-report',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  adminHelper.getVendorReport().then((vendors)=>{
    console.log(vendors);
    res.render('admin/vendor-report',{layout:"admin-layout.hbs",admin,vendors})
  })
})

router.get('/all-coupons',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  adminHelper.getAllCoupons().then((coupons)=>{
    res.render('admin/all-coupons',{layout:"admin-layout.hbs",admin,coupons})
  })
})

router.get('/add-coupon',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  let types = [{types:"Admin Coupon"},{types:"Festival Coupon"}]
  adminHelper.getAllUsers().then((users)=>{
    res.render('admin/add-coupons',{layout:'admin-layout',admin,types,users,"msg":req.session.couponMsg})
    req.session.couponMsg = false
  })
})

router.post('/add-coupon',verifyLogin,(req,res)=>{
  let admin = req.session.admin
  req.body.offer  = parseFloat(req.body.offer)
  req.body.coupon = random.getRandom(3,req.body.text,'','front')
  console.log(req.body)
  adminHelper.addCoupon(req.body).then((data)=>{
    console.log(data,"this is data");
    req.session.couponMsg = true;
    res.redirect('/admin/add-coupon')
  })
})

router.get('/block-user/:id',verifyLogin,async(req,res)=>{
  console.log(req.params)
  await adminHelper.blockUser(req.params.id).then(()=>{
    res.redirect('/admin/users')
  })
})

router.get('/unblock-user/:id',verifyLogin,async(req,res)=>{
  console.log(req.params)
  await adminHelper.unblockUser(req.params.id).then(()=>{
    res.redirect('/admin/users')
  })
})



module.exports = router;
