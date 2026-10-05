import { startPromotionClock } from '../config/promotionClock';
import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE } from '../config/apiConfig';
import { ensureSession, refreshSession, endSession, migrateBrowserStorage } from '../config/sessionClient';

export const ShopContext = createContext();
const API = API_BASE + '/api';

const GUEST_CART_KEY = 'baani_guest_cart';
const GUEST_WISHLIST_KEY = 'baani_guest_wishlist';

const loadGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const loadGuestWishlist = () => {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const normalize = (row) => {
  const product = row.product || {};
  const variant = (product.variants || []).find((item) => Number(item.id) === Number(row.variantId));
  return {
    ...product,
    ...(variant
      ? {
          salesPrice: variant.salesPrice ?? product.salesPrice,
          mrpPrice: variant.mrpPrice ?? product.mrpPrice,
          mainImage: variant.mainImage || product.mainImage,
        }
      : {}),
    id: row.productId,
    _rowId: row.id,
    variantId: row.variantId,
    variantLabel: variant ? [variant.variantType, variant.variantValue].filter(Boolean).join(': ') : null,
    selectedSubOption: row.selectedSubOption,
    quantity: row.quantity || 1,
    isPreorder: row.isPreorder,
  };
};

export const ShopProvider = ({ children }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [cartItems, setCartItems] = useState(loadGuestCart);
  const [wishlistItems, setWishlistItems] = useState(loadGuestWishlist);
  const [guestOrderHistory, setGuestOrderHistory] = useState([]);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState('');

  async function reloadItems(person) {
    if (!person?.id || person.isGuest) {
      setCartItems(loadGuestCart());
      setWishlistItems(loadGuestWishlist());
      return;
    }
    await axios.post(API + '/session/migrate-items').catch(() => {});
    try {
      const [cart, wishlist] = await Promise.all([
        axios.get(API + '/cart/' + person.id),
        axios.get(API + '/wishlist/' + person.id),
      ]);
      setCartItems(cart.data.map(normalize));
      setWishlistItems(wishlist.data.map(normalize));
    } catch (e) {
      console.warn('Could not reload customer items:', e);
    }
  }

  async function refreshGuestOrders() {
    try {
      const { data } = await axios.get(API + '/session/guest-orders');
      setGuestOrderHistory(data);
    } catch (_) {}
  }

  async function start() {
    try {
      await ensureSession();
      const session = await migrateBrowserStorage();
      setCustomer(session.customer);
      await reloadItems(session.customer);
      await refreshGuestOrders();
      setSessionError('');
      setReady(true);
    } catch (error) {
      setSessionError(error.response?.data?.message || 'Unable to connect. Please retry.');
    }
  }

  useEffect(() => {
    start();
    return startPromotionClock();
  }, []);

  useEffect(() => {
    const refresh = () => reloadItems(customer).catch(() => {});
    window.addEventListener('promotions-changed', refresh);
    return () => window.removeEventListener('promotions-changed', refresh);
  }, [customer]);

  async function login(fallbackCustomer) {
    const session = await refreshSession();
    const activeCustomer = session?.customer || fallbackCustomer || null;
    setCustomer(activeCustomer);
    if (activeCustomer?.id && !activeCustomer.isGuest) {
      const gCart = loadGuestCart();
      if (gCart.length > 0) {
        try {
          await axios.post(API + '/cart/sync/' + activeCustomer.id, { cartItems: gCart });
          localStorage.removeItem(GUEST_CART_KEY);
        } catch (e) {
          console.error('Cart sync error:', e);
        }
      }
      const gWish = loadGuestWishlist();
      if (gWish.length > 0) {
        try {
          await axios.post(API + '/wishlist/sync/' + activeCustomer.id, { wishlistItems: gWish });
          localStorage.removeItem(GUEST_WISHLIST_KEY);
        } catch (e) {
          console.error('Wishlist sync error:', e);
        }
      }
    }
    await reloadItems(activeCustomer);
    await refreshGuestOrders();
  }

  async function logout() {
    try {
      await endSession();
      setCustomer(null);
      setCartItems(loadGuestCart());
      setWishlistItems(loadGuestWishlist());
      setGuestOrderHistory([]);
    } catch {
      alert('Logout failed. Please try again.');
    }
  }

  async function mutate(action) {
    try {
      await action();
      await reloadItems(customer);
      return true;
    } catch (error) {
      alert(error.response?.data?.message || 'Unable to save changes. Please retry.');
      return false;
    }
  }

  const isProductInCart = (id, variantId = null) =>
    cartItems.some(
      (item) => String(item.id || item.productId) === String(id) && Number(item.variantId || 0) === Number(variantId || 0)
    );

  const isProductInWishlist = (id, variantId = null) =>
    wishlistItems.some(
      (item) => String(item.id || item.productId) === String(id) && Number(item.variantId || 0) === Number(variantId || 0)
    );

  async function addToCart(product, quantity = 1) {
    const qty = Math.max(1, Number(quantity) || 1);
    if (customer && !customer.isGuest) {
      if (isProductInCart(product.id, product.variantId)) {
        toast.info('Item is already in your cart');
        return true;
      }
      const res = await mutate(() =>
        axios.post(API + '/cart/add', {
          customerId: customer.id,
          productId: product.id,
          variantId: product.variantId || null,
          selectedSubOption: product.selectedSubOption || null,
          quantity: qty,
          isPreorder: Boolean(product.isPreorder || Number(product.stock) <= 0),
        })
      );
      if (res) toast.success(`"${product.name || 'Item'}" added to cart!`);
      return res;
    }

    // Guest Cart (frictionless, no login prompt)
    const current = loadGuestCart();
    const existingIndex = current.findIndex(
      (item) => String(item.id || item.productId) === String(product.id) && Number(item.variantId || 0) === Number(product.variantId || 0)
    );

    let updated;
    if (existingIndex > -1) {
      updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: Math.min(99, Number(updated[existingIndex].quantity || 1) + qty),
      };
      toast.info(`Updated quantity in cart (${updated[existingIndex].quantity})`);
    } else {
      const normalizedItem = {
        ...product,
        id: product.id,
        productId: product.id,
        _rowId: `guest_cart_${product.id}_${Date.now()}`,
        variantId: product.variantId || null,
        variantLabel: product.variantLabel || null,
        selectedSubOption: product.selectedSubOption || null,
        quantity: qty,
        stock: product.stock !== undefined ? product.stock : null,
        isPreorder: Boolean(product.isPreorder || Number(product.stock) <= 0),
        salesPrice: Number(product.salesPrice ?? product.price ?? product.mrpPrice ?? 0),
        mrpPrice: Number(product.mrpPrice ?? product.salesPrice ?? 0),
        mainImage: product.mainImage || product.image,
      };
      updated = [normalizedItem, ...current];
      toast.success(`"${product.name || 'Item'}" added to cart!`);
    }
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
    setCartItems(updated);
    return true;
  }

  async function removeFromCart(id, variantId = null) {
    if (customer && !customer.isGuest) {
      const item = cartItems.find(
        (item) => String(item.id || item.productId) === String(id) && Number(item.variantId || 0) === Number(variantId || 0)
      );
      if (item) {
        const res = await mutate(() => axios.delete(API + '/cart/remove/' + item._rowId));
        if (res) toast.info('Item removed from cart');
        return res;
      }
      return;
    }
    const current = loadGuestCart();
    const updated = current.filter(
      (item) => !(String(item.id || item.productId) === String(id) && Number(item.variantId || 0) === Number(variantId || 0))
    );
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
    setCartItems(updated);
    toast.info('Item removed from cart');
    return true;
  }

  async function updateQuantity(id, variantId = null, newQty) {
    const qty = Math.max(1, Math.min(99, Number(newQty) || 1));
    if (customer && !customer.isGuest) {
      const item = cartItems.find(
        (item) => String(item.id || item.productId) === String(id) && Number(item.variantId || 0) === Number(variantId || 0)
      );
      if (item && item._rowId) {
        const res = await mutate(() => axios.put(API + '/cart/update/' + item._rowId, { quantity: qty }));
        return res;
      }
      return false;
    }

    // Guest Cart
    const current = loadGuestCart();
    const updated = current.map((item) => {
      if (String(item.id || item.productId) === String(id) && Number(item.variantId || 0) === Number(variantId || 0)) {
        return { ...item, quantity: qty };
      }
      return item;
    });
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
    setCartItems(updated);
    return true;
  }

  async function addToWishlist(product) {
    if (customer && !customer.isGuest) {
      const res = await mutate(() =>
        axios.post(API + '/wishlist/toggle', {
          customerId: customer.id,
          productId: product.id,
          variantId: product.variantId || null,
          selectedSubOption: product.selectedSubOption || null,
        })
      );
      if (res) toast.success(`"${product.name || 'Item'}" added to wishlist!`);
      return res;
    }
    const current = loadGuestWishlist();
    if (
      current.some(
        (item) => String(item.id || item.productId) === String(product.id) && Number(item.variantId || 0) === Number(product.variantId || 0)
      )
    ) {
      return true;
    }
    const normalizedItem = {
      ...product,
      id: product.id,
      productId: product.id,
      _rowId: `guest_wish_${product.id}_${Date.now()}`,
      variantId: product.variantId || null,
      variantLabel: product.variantLabel || null,
      selectedSubOption: product.selectedSubOption || null,
      salesPrice: Number(product.salesPrice ?? product.price ?? product.mrpPrice ?? 0),
      mrpPrice: Number(product.mrpPrice ?? product.salesPrice ?? 0),
      mainImage: product.mainImage || product.image,
    };
    const updated = [normalizedItem, ...current];
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(updated));
    setWishlistItems(updated);
    toast.success(`"${product.name || 'Item'}" added to wishlist!`);
    return true;
  }

  async function removeFromWishlist(id, variantId = null) {
    if (customer && !customer.isGuest) {
      const item = wishlistItems.find(
        (item) => String(item.id || item.productId) === String(id) && (!variantId || Number(item.variantId || 0) === Number(variantId || 0))
      );
      if (item) {
        const res = await mutate(() => axios.delete(API + '/wishlist/remove/' + item._rowId));
        if (res) toast.info('Removed from wishlist');
        return res;
      }
      return;
    }
    const current = loadGuestWishlist();
    const updated = current.filter(
      (item) => !(String(item.id || item.productId) === String(id) && (!variantId || Number(item.variantId || 0) === Number(variantId || 0)))
    );
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(updated));
    setWishlistItems(updated);
    toast.info('Removed from wishlist');
    return true;
  }

  function toggleWishlist(product) {
    return isProductInWishlist(product.id, product.variantId)
      ? removeFromWishlist(product.id, product.variantId)
      : addToWishlist(product);
  }

  async function clearCart() {
    if (customer?.id && !customer.isGuest) {
      return mutate(() => axios.delete(API + '/cart/clear/' + customer.id));
    }
    localStorage.removeItem(GUEST_CART_KEY);
    setCartItems([]);
    return true;
  }

  const cartTotal = cartItems.reduce(
    (sum, item) => sum + Number(item.salesPrice ?? item.mrpPrice ?? item.price ?? 0) * Number(item.quantity || 1),
    0
  );

  if (!ready) {
    return sessionError ? (
      <div role="alert" style={{ padding: 24 }}>
        {sessionError} <button onClick={start}>Retry</button>
      </div>
    ) : null;
  }

  return (
    <ShopContext.Provider
      value={{
        cartItems,
        wishlistItems,
        customer,
        token: customer ? 'session' : null,
        guestOrderHistory,
        refreshGuestOrders,
        isAuthenticated: Boolean(customer && !customer.isGuest),
        cartTotal,
        login,
        logout,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        isProductInCart,
        isProductInWishlist,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};
