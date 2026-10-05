import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Footer from './components/Footer/Footer';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import Shop from './pages/Shop/Shop';
import ProductDetails from './pages/ProductDetails/ProductDetails';
import Cart from './pages/Cart/Cart';
import Wishlist from './pages/Wishlist/Wishlist';
import Checkout from './pages/Checkout/Checkout';
import Account from './pages/Account/Account';
import Collections from './pages/Collections/Collections';
import TrackOrder from './pages/TrackOrder/TrackOrder';
import PrivacyPolicy from './pages/Policies/PrivacyPolicy';
import ShippingPolicy from './pages/Policies/ShippingPolicy';
import TermsConditions from './pages/Policies/TermsConditions';
import { ShopProvider } from './context/ShopContext';
import SparkleCursor from './components/SparkleCursor';
import FloatingSocials from './components/FloatingSocials/FloatingSocials';
import './responsive.css';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
    // Refresh AOS so animations on the newly opened page calculate positions accurately
    const timer = setTimeout(() => {
      AOS.refresh();
    }, 80);
    return () => clearTimeout(timer);
  }, [pathname, search]);

  return null;
}

function App() {
  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out',
      once: true,    // Animate once; do not hide elements on reverse scroll
      mirror: false, // Prevents elements from disappearing when scrolling past them
      offset: 30,    // Trigger early so content is immediately visible
    });
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <ShopProvider>
        <div className="app">
          <SparkleCursor />
          <Navbar />
          <ToastContainer
            position="top-right"
            autoClose={2500}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="light"
          />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/collections/:slug" element={<Collections />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/account" element={<Account />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/terms-conditions" element={<TermsConditions />} />
            <Route path="/terms" element={<TermsConditions />} />
          </Routes>
          <Footer />
          <FloatingSocials />
        </div>
      </ShopProvider>
    </Router>
  );
}

export default App;
