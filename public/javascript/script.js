function addToCart(productId) {
  let count = document.getElementById("quantity").value;
  $.ajax({
    url: "/add-to-cart/" + productId,
    method: "get",
    data: { productId: productId, count: count },
    success: (response) => {
      console.log("in success of ajax add to cart")
      if (!response.status) {
        console.log("login");
        document.getElementById("quantity").value = 1;
        window.location.href = "/login";
      } else {
        
        document.getElementById("quantity").value = 1;
        let cartCount = $("#cart-count").html();
        cartCount = parseInt(cartCount) + 1;
        $("#cart-count").html(cartCount);
      }
    }
  });
  return false;
}

function changeQuantity(cartId, productId, userId, count) {
  let quantity = parseInt(
    document.getElementById(productId + "quantity").innerHTML
  );
  let counter = parseInt(count);
  let cartlength = parseInt(document.getElementById("cartlength").value);
  $.ajax({
    url: "/change-quantity",
    data: {
      cart: cartId,
      product: productId,
      count: counter,
      quantity: quantity,
      user: userId,
    },
    method: "post",
    success: (response) => {
      if (response.removeProduct) {
        alert("Product removed");
        if (cartlength === 1) {
          location.reload();
        } else {
          $("#container").load(" #container");
        }
      } else {
        document.getElementById(productId + "quantity").innerHTML =
          quantity + count;
        document.getElementById("subtotal").innerHTML = response.subtotal;
        number =
          parseFloat(
            document.getElementById(productId + "quantity").innerHTML
          ) *
          parseFloat(document.getElementById(productId + "price").innerHTML);
        document.getElementById(productId + "totalprice").innerHTML =
          Math.round((number + Number.EPSILON) * 100) / 100;
      }
    },
  });
}
let document1 = document.getElementById("remove");

function addToWishlist(productId) {
  $.ajax({
    url: "/add-to-wishlist/" + productId,
    method: "get",
    success: (response) => {
      if (!response.status) {
        console.log("login");
        window.location.href = "/login";
      } else {
        $(document1).removeClass("like_us");
        $(document1).addClass("eng");
        $("#addTocartI").load(" #addTocartI");
        let count = $("#wishlist-count").html();
        count = parseInt(count) + 1;
        $("#wishlist-count").html(count);
      }
    },
  });
  return false;
}

function addToWishlistFromProductDetails(productId) {
  $.ajax({
    url: "/add-to-wishlist/" + productId,
    method: "get",
    success: (response) => {
      if (!response.status) {
        console.log("login");
        window.location.href = "/login";
      } else {
        $(document1).removeClass("like_us");
        $(document1).addClass("eng");
        $("#addTocartI").load(" #addTocartI");
        let count = $("#wishlist-count").html();
        count = parseInt(count) + 1;
        $("#wishlist-count").html(count);
      }
    },
  });
  return false;
}

function removeWishlistItem(productId) {
  $.ajax({
    url: "/remove-wishlist-item/" + productId,
    method: "get",
    success: (response) => {
      if (response.status) {
        location.reload();
      }
    },
  });
  return false;
}

function removeWishlistItemFromProductsDetails(productId) {
  $.ajax({
    url: "/remove-wishlist-item/" + productId,
    method: "get",
    success: (response) => {
      alert("oolala");
      if (response.status) {
        $(document1).removeClass("eng");
        $(document1).addClass("like_us");
        $("#addTocartI").load(" #addTocartI");
      }
    },
  });
  return false;
}

function moveToCart(id) {
  alert(id);
  $.ajax({
    url: "/move-to-cart/" + id,
    method: "get",
    success: (response) => {
      if (response.status) {
        location.reload();
      }
    },
  });
  return false;
}

//script for custom search box

// getting all required elements
