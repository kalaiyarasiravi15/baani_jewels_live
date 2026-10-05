import { getSession, savePreference, endSession, sessionFetch } from '../sessionClient';
import React, { useState, useEffect } from "react";
import {
  RiDashboardFill, RiShoppingBag3Fill, RiPriceTag3Fill,
  RiUser3Fill, RiImage2Fill, RiStarFill,
  RiStackFill, RiArrowDownSLine, RiLogoutBoxRFill,
  RiMailFill, RiBarChartGroupedFill, RiTicketFill,
  RiTimerFlashFill, RiSettings4Fill, RiChatQuoteFill,
  RiContactsBook2Fill, RiTruckLine,
  RiLayoutGridFill, RiMoneyDollarCircleLine,
  RiStore2Line, RiInformationFill,
} from "react-icons/ri";
import axios from "axios";
import { toast } from "react-toastify";
import "./Sidebar.css";
import { API } from "../config";

const Sidebar = ({ setActivePage, activePage, setOrderStatus, orderStatus }) => {
  const [orderOpen, setOrderOpen] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const orderStatuses = ["Pre-Booking", "Pending", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
  const adminRole = getSession()?.admin?.role || "admin";

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const r = await axios.get(`${API}/dashboard/badges`);
        if (r.data) setInboxCount(r.data.inboxCount || 0);
      } catch (e) {}
    };
    fetchBadges();
    window.addEventListener("unread-messages-updated", fetchBadges);
    const interval = setInterval(fetchBadges, 30000);
    return () => { clearInterval(interval); window.removeEventListener("unread-messages-updated", fetchBadges); };
  }, []);

  const handleOrderClick = (status) => { setOrderStatus(status); setActivePage("orders"); setOrderOpen(true); };

  const handleLogout = () => {
    toast.warn(
      <div style={{ lineHeight: 1.6, fontFamily: "Inter, sans-serif" }}>
        <strong style={{ fontSize: 14 }}>Logout from Admin Panel?</strong>
        <p style={{ margin: "6px 0 10px", fontSize: 13, color: "#64748b" }}>You will be redirected to the login page.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={async () => { toast.dismiss(); await endSession(); toast.success("Logged out!", { autoClose: 1500, onClose: () => { window.location.href = "/login"; } }); }} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Yes, Logout</button>
          <button onClick={() => toast.dismiss()} style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false, icon: false, position: "top-center" }
    );
  };

  const navItem = (page, icon, label, badge = 0) => (
    <div className={`nav-item ${activePage === page ? "active" : ""}`} onClick={() => { setActivePage(page); setOrderOpen(false); }}>
      <div className="nav-left">{icon} {label}</div>
      {badge > 0 && <span className="unread-badge">{badge}</span>}
    </div>
  );

  return (
    <aside className="ars-sidebar">
      <div className="sidebar-brand-container">
        <div className="sidebar-logo-text-wrap">
          <img src="/admin_logo.jpeg" alt="Baani Jewels" className="sidebar-logo-img" />
        </div>
      </div>
      <nav className="ars-nav">
        <div className="nav-section-label">Main Menu</div>
        {navItem("dashboard", <RiDashboardFill />, "Dashboard")}

        <div className={`nav-item ${activePage === "orders" ? "active" : ""} ${orderOpen ? "open-parent" : ""}`} onClick={() => { setOrderOpen(!orderOpen); if (!orderOpen && activePage !== "orders") handleOrderClick("All"); }}>
          <div className="nav-left"><RiShoppingBag3Fill /> Orders</div>
          <RiArrowDownSLine className={`arrow-icon ${orderOpen ? "rotate" : ""}`} />
        </div>
        {orderOpen && (
          <div className="order-submenu">
            <div className={`sub-item ${activePage === "orders" && orderStatus === "All" ? "sub-active" : ""}`} onClick={() => handleOrderClick("All")}>All Orders</div>
            {orderStatuses.map(s => (
              <div key={s} className={`sub-item ${activePage === "orders" && orderStatus === s ? "sub-active" : ""}`} onClick={() => handleOrderClick(s)}>{s}</div>
            ))}
          </div>
        )}

        <div className="nav-section-label">Inventory</div>
        {navItem("products",         <RiStackFill />,        "Products")}
        {navItem("categories",       <RiPriceTag3Fill />,    "Categories")}
        {navItem("home-collections", <RiLayoutGridFill />,   "Collections")}
        {navItem("stock",            <RiStore2Line />,       "Stock")}
        {navItem("shipping-zones",   <RiTruckLine />,        "Shipping Zones")}

        <div className="nav-section-label">Promotions</div>
        {navItem("banner",       <RiImage2Fill />,            "Banners")}
        {navItem("deal-of-day",  <RiTimerFlashFill />,        "Deal of Day")}
        {navItem("offer-banner", <RiMoneyDollarCircleLine />, "Offer Banners")}
        {navItem("coupons",      <RiTicketFill />,            "Coupons")}

        <div className="nav-section-label">Customers</div>
        {navItem("customers",    <RiUser3Fill />,       "Customers")}
        {navItem("reviews",      <RiStarFill />,        "Reviews")}
        {navItem("testimonials", <RiChatQuoteFill />,   "Testimonials")}
        {navItem("inbox",        <RiMailFill />,         "Inbox", inboxCount)}

        <div className="nav-section-label">Pages CMS</div>
        {navItem("about-settings", <RiInformationFill />, "About Page")}
        {navItem("contact-settings", <RiContactsBook2Fill />, "Contact Page")}

        {adminRole === "admin" && navItem("reports", <RiBarChartGroupedFill />, "Reports")}

        {adminRole === "admin" && (
          <>
            <div className="nav-section-label">System</div>
            {navItem("settings", <RiSettings4Fill />, "Settings")}
          </>
        )}

        <div className="nav-item logout-item" onClick={handleLogout}>
          <div className="nav-left"><RiLogoutBoxRFill className="logout-icon" /> Logout</div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
