// UserProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { jwtDecode } from "jwt-decode"; // preserved as in your original file
import { useConfig } from "./ConfigProvider";
import './UserProfilePage.css';
import EditIcon from '@mui/icons-material/ModeEditOutlineOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { Gauge, UsersFour, Invoice , Archive, ChartLineUp, MicrosoftExcelLogo, ShoppingCart, CreditCard, Receipt} from "@phosphor-icons/react";

// Mock data (used as initial fallback while API loads)
const mockUser = {
    profilePic: 'https://placehold.co/150x150/00aaff/FFFFFF?text=JD',
    shopLogo: 'https://placehold.co/100x100/ffcc00/000000?text=Shop',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 9876543210',
    address: '123 Tech Park, Bangalore, India',
    shopOwner: 'John Doe',
    shopLocation: 'Main Street, Bangalore',
    gstNumber: '29ABCDE1234F1Z5',
    shopName: 'The Shop',
    shopEmail: 'shop@example.com',
    shopPhone: '9988776655',
    gstin: '29ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    upi: 'john@upi',
    bankHolder: 'John Doe',
    bankAccount: '1234567890',
    bankIfsc: 'HDFC0001234',
    bankName: 'HDFC Bank',
    bankAddress: 'MG Road, Bangalore',
    terms1: 'All items once sold are not returnable.',
    terms2: 'Taxes applicable as per government norms.',
    terms3: 'Payment must be completed before dispatch.',
    userSource: 'email'
};

const UserProfilePage = () => {
    // Tabs
    const [activeTab, setActiveTab] = useState('user');

    // Core data
    const [user, setUser] = useState({});
    const [formData, setFormData] = useState({});

    // Editing state
    const [isEditing, setIsEditing] = useState(false); // user edit
    const [sectionEdit, setSectionEdit] = useState({ basic: false, finance: false, others: false }); // shop sections

    // misc
    const [errors, setErrors] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordStep, setPasswordStep] = useState(1);
    const [userSource, setUserSource] = useState('email');

    // files & previews
    const [profilePicFile, setProfilePicFile] = useState(null);
    const [profilePicPreview, setProfilePicPreview] = useState(null);
    const [shopLogoFile, setShopLogoFile] = useState(null);
    const [shopLogoPreview, setShopLogoPreview] = useState(null);

    const fileInputRef = useRef(null);
    const shopLogoInputRef = useRef(null);

    const config = useConfig();
    const apiUrl = config?.API_URL || "";
    const authApiUrl = config?.AUTH_API_URL || ""; // preserved if you use it elsewhere

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        // initial fallback while API loads
        setFormData(mockUser);
        setUser(mockUser);
        setProfilePicPreview(mockUser.profilePic);
        setShopLogoPreview(mockUser.shopLogo);
    }, []);

    useEffect(() => {
        // keep logic and API calls from your original file intact while adding shop-logo fetch
        let profilePicObjectUrl = null;
        let shopLogoObjectUrl = null;

        const loadProfile = async () => {
            if (!apiUrl) return; // don't attempt if API base isn't available

            try {
                // 1) get session (username)
                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });
                if (!userRes.ok) throw new Error(`User session fetch failed (${userRes.status})`);

                const { username } = await userRes.json();

                // 2) get full user details
                const detailsRes = await fetch(`${apiUrl}/api/shop/user/get/userprofile/${username}`, {
                    method: "GET",
                    credentials: 'include',
                    headers: { Accept: "application/json" },
                });
                if (!detailsRes.ok) throw new Error(`User details fetch failed (${detailsRes.status})`);
                const details = await detailsRes.json();

                // set state from API
                setUser(details);
                setFormData(details);
                setUserSource(details.userSource || 'email');

                // 3) fetch profile pic (if available) — preserve original logic
                try {
                    const picRes = await fetch(`${apiUrl}/api/shop/user/${username}/profile-pic`, {
                        method: "GET",
                        credentials: 'include',
                    });
                    if (picRes.ok) {
                        const blob = await picRes.blob();
                        if (blob && blob.size > 0) {
                            profilePicObjectUrl = URL.createObjectURL(blob);
                            setProfilePicPreview(profilePicObjectUrl);
                        }
                    } else if (picRes.status !== 404) {
                        console.warn(`Profile pic fetch failed (${picRes.status})`);
                    }
                } catch (picErr) {
                    console.warn('Profile pic fetch error:', picErr);
                }

                // 4) fetch shop logo (optional endpoint; harmless if 404)
                try {
                    const logoRes = await fetch(`${apiUrl}/api/shop/user/${username}/shop-logo`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (logoRes.ok) {
                        const blob = await logoRes.blob();
                        if (blob && blob.size > 0) {
                            shopLogoObjectUrl = URL.createObjectURL(blob);
                            setShopLogoPreview(shopLogoObjectUrl);
                        }
                    }
                } catch (logoErr) {
                    console.warn('Shop logo fetch error:', logoErr);
                }
            } catch (err) {
                console.error("Error loading profile:", err);
                // keep user-friendly message but don't remove original behavior
                alert("Something went wrong while loading your profile.");
            }
        };

        loadProfile();

        return () => {
            if (profilePicObjectUrl) URL.revokeObjectURL(profilePicObjectUrl);
            if (shopLogoObjectUrl) URL.revokeObjectURL(shopLogoObjectUrl);
        };
    }, [apiUrl]);

    // ------------------------ user editing (keeps your original API calls & logic) ------------------------
    const handleCancel = () => {
        setFormData(user);
        setProfilePicPreview(user.profilePic || profilePicPreview);
        setShopLogoPreview(user.shopLogo || shopLogoPreview);
        setErrors({});
        setIsEditing(false);
    };

    const validateForm = () => {
        // preserve placeholder — you can keep your validation logic here unchanged
        return true;
    };

    const handleEditToggle = async () => {
        // keep same semantics as your original file
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        if (!validateForm()) return;

        try {
            // get username from session endpoint
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('Could not get user session');
            const { username } = await userRes.json();

            // Update text details using the same endpoint you used originally
            const detailsResponse = await fetch(`${apiUrl}/api/shop/user/edit/${username}`, {
                method: "PUT",
                credentials: 'include',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!detailsResponse.ok) throw new Error("Failed to update user details");

            // Update profile picture if a new one was selected — preserve original flow
            if (profilePicFile) {
                const picForm = new FormData();
                picForm.append("profilePic", profilePicFile, profilePicFile.name);
                const picResponse = await fetch(`${apiUrl}/api/shop/user/edit/profilePic/${username}`, {
                    method: "PUT",
                    credentials: 'include',
                    body: picForm,
                });
                if (!picResponse.ok) throw new Error("Failed to update profile picture");
            }

            setUser({ ...formData, profilePic: profilePicPreview });
            setIsEditing(false);
            alert("Profile updated successfully!");

        } catch (error) {
            console.error("Error updating user:", error);
            alert("Something went wrong while updating user details.");
        }
    };

    const handleProfilePicChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setProfilePicPreview(URL.createObjectURL(file));
            setProfilePicFile(file);
        }
    };

    // ------------------------ password handler (kept as in your original file) ------------------------
    const handlePasswordSubmit = async () => {
        if (passwordStep === 1) {
            try {
                // 1. Get token from localStorage


                const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                    method: "GET",
                    credentials: 'include',
                });

                if (!userRes.ok) {
                    console.error('Failed to fetch user data:', userRes.statusText);
                    return;
                }

                const userData = await userRes.json();
                const username = userData.username;

                // 2. Decode token to extract username

                // 3. Call generateToken API with username + entered currentPassword

                const response = await fetch(authApiUrl+"/auth/authenticate", {
                    method: "POST",
                    credentials: 'include',
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username,
                        password: passwordData.currentPassword,
                    }),
                });

                if (!response.ok) {
                    alert("Invalid current password. Please try again.");
                    return;
                }

                //const data = await response.json();
                const data = await response.text();
                if (data) {
                    console.log("Password validated successfully");
                    setPasswordStep(2); // move to next step
                } else {
                    alert("Password validation failed.");
                }
            } catch (error) {
                console.error("Error validating password:", error);
                alert("Something went wrong while validating password.");
            }
        } else {
            // Step 2: Update password
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                alert("New passwords do not match. Please try again.");
                return;
            }
            if (passwordData.newPassword.length < 4) {
                alert("Password must be at least 4 characters long.");
                return;
            }

            try {

                console.log("Updating password for apiUrl:", apiUrl);

                // Call update password API
                // Note: You might need to adjust the endpoint and payload based on your backend
                const response = await fetch(apiUrl+"/api/shop/user/updatepassword", {
                    method: "POST",
                    credentials: 'include',// send old token for authentication
                    headers: {
                        "Content-Type": "application/json",

                    },
                    body: JSON.stringify({
                        password: passwordData.newPassword,
                    }),
                });

                if (!response.ok) {
                    alert("Failed to update password.");
                    return;
                }

                alert("Password updated successfully!");
                setShowPasswordModal(false);
                setPasswordStep(1);
                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            } catch (error) {
                console.error("Error updating password:", error);
                alert("Something went wrong while updating password.");
            }
        }
    };

    // ------------------------ Shop: per-section edit/save logic ------------------------
    const handleShopLogoChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setShopLogoPreview(URL.createObjectURL(file));
            setShopLogoFile(file);
        }
    };

    const handleSectionEdit = (section) => {
        setSectionEdit(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleIFSCBlur = async () => {
        // Call Razorpay IFSC lookup and map NAME/ADDRESS (if present) -> bankName / bankAddress
        const ifsc = (formData.bankIfsc || '').trim();
        if (!ifsc) return;
        try {
            const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
            if (!res.ok) {
                console.warn('IFSC lookup returned non-ok');
                alert('IFSC code not found');
                return;
            }
            const data = await res.json();
            // some IFSC responses use BANK, some may provide NAME — prefer NAME then BANK
            const bankNameFromApi = data.NAME || data.BANK || '';
            const bankAddressFromApi = data.ADDRESS || '';
            setFormData(prev => ({ ...prev, bankName: bankNameFromApi, bankAddress: bankAddressFromApi }));
        } catch (err) {
            console.error('IFSC lookup failed:', err);
        }
    };

    const handlePincodeBlur = async () => {
        const pincode = (formData.shopPincode || '').trim(); // or whichever field you’re using
        if (!pincode) return;

        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
            if (!res.ok) {
                console.warn('Pincode lookup returned non-ok');
                alert('Invalid Pincode or API error');
                return;
            }

            const data = await res.json();

            if (!data || !Array.isArray(data) || data.length === 0 || data[0].Status !== 'Success') {
                alert('No details found for this Pincode');
                return;
            }

            const postOffice = data[0].PostOffice && data[0].PostOffice[0];
            if (!postOffice) {
                alert('No post office details found for this Pincode');
                return;
            }

            const stateFromApi = postOffice.State || '';
            const districtFromApi = postOffice.District || '';
            const countryFromApi = postOffice.Country || '';
            const areaFromApi = postOffice.Name || '';

            setFormData(prev => ({
                ...prev,
                shopState: stateFromApi,
                shopCity: districtFromApi
            }));
        } catch (err) {
            console.error('Pincode lookup failed:', err);
            alert('Failed to fetch pincode details');
        }
    };



    // Custom hoverable button now using global .btn style
    const HoverButton = ({ onClick, disabled, children, className = '', hoverStyle }) => {
        const [hover, setHover] = useState(false);
        const combinedClassName = `btn ${className}`;

        return (
            <button
                className={combinedClassName}
                onClick={onClick}
                disabled={disabled}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                style={hover && !disabled ? hoverStyle : {}}
            >
                {children}
            </button>
        );
    };
    const handleSectionSave = async (section) => {
        try {
            // get username first (same as original user update flow)
            const userRes = await fetch(`${apiUrl}/api/shop/user/profile`, {
                method: "GET",
                credentials: 'include',
            });
            if (!userRes.ok) throw new Error('Could not get user session');
            const { username } = await userRes.json();

            if (section === 'basic') {
                // If shop logo file exists upload it separately (multipart)
                if (shopLogoFile) {
                    const logoForm = new FormData();
                    logoForm.append('shopLogo', shopLogoFile, shopLogoFile.name);

                    const logoResp = await fetch(`${apiUrl}/api/shop/user/edit/details/shopLogo`, {
                        method: 'PUT',
                        credentials: 'include',
                        body: logoForm,
                    });
                    if (!logoResp.ok) throw new Error('Failed to upload shop logo');
                }

                // Send only basic fields
                const basicPayload = {
                    shopName: formData.shopName,
                    shopAddress: formData.shopAddress,
                    shopEmail: formData.shopEmail,
                    shopPhone: formData.shopPhone,
                    shopSlogan: formData.shopSlogan,
                    shopPincode: formData.shopPincode,
                    shopCity: formData.shopCity,
                    shopState: formData.shopState

                };

                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/basic`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(basicPayload),
                });
                if (!resp.ok) throw new Error('Failed to update basic shop details');

                alert('Basic shop details updated');
                setSectionEdit(prev => ({ ...prev, basic: false }));
                setUser(prev => ({ ...prev, ...basicPayload, shopLogo: shopLogoPreview }));
            }

            if (section === 'finance') {
                const financePayload = {
                    gstin: formData.gstin || formData.gstNumber,
                    pan: formData.pan,
                    upi: formData.upi,
                    bankHolder: formData.bankHolder,
                    bankAccount: formData.bankAccount,
                    bankIfsc: formData.bankIfsc,
                    bankName: formData.bankName,
                    bankAddress: formData.bankAddress
                };

                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/finance`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(financePayload),
                });
                if (!resp.ok) throw new Error('Failed to update finance details');

                alert('Finance details updated');
                setSectionEdit(prev => ({ ...prev, finance: false }));
                setUser(prev => ({ ...prev, ...financePayload }));
            }

            if (section === 'others') {
                const othersPayload = {
                    terms1: formData.terms1,
                    terms2: formData.terms2,
                    terms3: formData.terms3
                };
                alert("reached here to save other");
                const resp = await fetch(`${apiUrl}/api/shop/user/edit/details/others`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(othersPayload),
                });
                if (!resp.ok) throw new Error('Failed to update other details');

                alert('Other details updated');
                setSectionEdit(prev => ({ ...prev, others: false }));
                setUser(prev => ({ ...prev, ...othersPayload }));
            }


        } catch (err) {
            console.error('Section save failed:', err);
            alert('Something went wrong while saving the section');
        }
    };

    const isGoogleUser = userSource === 'google';

    // ------------------------ render ------------------------
    return (
        <div className="user-profile-page">
            <div className="glass-card" style={{width:'100%'}}>
                <div className="profile-header">
                    <div className="ribbon"><span>Account Source: {userSource}</span></div>
                    <h2>User & Shop Profile</h2>
                    <span className="info-text" style={{marginLeft: "-1100px"}}>* You cannot update Name, Email and Profile Photo if source is google</span>
                </div>
                {/* Tabs */}
                <div className="tab-header">
                    <button className={`tab-btn ${activeTab === 'user' ? 'active' : ''}`} onClick={() => setActiveTab('user')}>User Details</button>
                    <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>Shop Details</button>
                </div>

                {/* USER TAB */}
                {activeTab === 'user' && (
                    <div className="tab-content">
                        <div className="avatar-container">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleProfilePicChange}
                                style={{ display: 'none' }}
                                accept="image/*"
                                disabled={!isEditing || isGoogleUser}
                            />
                            <img
                                src={profilePicPreview || 'https://placehold.co/150x150/e0f7ff/00aaff?text=No+Img'}
                                alt="Profile"
                                className={`avatar ${isEditing && !isGoogleUser ? 'editable' : ''}`}
                                onClick={() => { if (isEditing && !isGoogleUser) fileInputRef.current.click(); }}
                            />
                            {isEditing && !isGoogleUser && <small>Click image to change</small>}
                        </div>

                        <div className="two-column">
                            <div className="column">
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" value={formData.name || ''} disabled={!isEditing || isGoogleUser} onChange={e => setFormData({ ...formData, name: e.target.value })} className={errors.name ? 'error' : ''} />
                                    {errors.name && <div className="error-message">{errors.name}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" value={formData.email || ''} disabled className={errors.email ? 'error' : ''} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="text" value={formData.phone || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={errors.phone ? 'error' : ''} />
                                    {errors.phone && <div className="error-message">{errors.phone}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Address</label>
                                    <input type="text" value={formData.address || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, address: e.target.value })} className={errors.address ? 'error' : ''} />
                                    {errors.address && <div className="error-message">{errors.address}</div>}
                                </div>
                            </div>

                            <div className="column">
                                <div className="form-group">
                                    <label>Shop Name</label>
                                    <input type="text" value={formData.shopName || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopName: e.target.value })} className={errors.shopName ? 'error' : ''} />
                                    {errors.shopName && <div className="error-message">{errors.shopName}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Shop Owner</label>
                                    <input type="text" value={formData.shopOwner || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopOwner: e.target.value })} className={errors.shopOwner ? 'error' : ''} />
                                    {errors.shopOwner && <div className="error-message">{errors.shopOwner}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Shop Email</label>
                                    <input type="text" value={formData.shopEmail || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopEmail: e.target.value })} className={errors.shopEmail ? 'error' : ''} />
                                    {errors.shopEmail && <div className="error-message">{errors.shopEmail}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Shop Phone</label>
                                    <input type="number" value={formData.shopPhone || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopPhone: e.target.value })} className={errors.shopPhone ? 'error' : ''} />
                                    {errors.shopPhone && <div className="error-message">{errors.shopPhone}</div>}
                                </div>
                                <div className="form-group">
                                    <label>Shop Location</label>
                                    <input type="text" value={formData.shopLocation || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, shopLocation: e.target.value })} className={errors.shopLocation ? 'error' : ''} />
                                    {errors.shopLocation && <div className="error-message">{errors.shopLocation}</div>}
                                </div>
                                <div className="form-group">
                                    <label>GST Number</label>
                                    <input type="text" value={formData.gstNumber || formData.gstin || ''} disabled={!isEditing} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} className={errors.gstNumber ? 'error' : ''} />
                                    {errors.gstNumber && <div className="error-message">{errors.gstNumber}</div>}
                                </div>
                            </div>
                        </div>

                        <div className="button-row">
                            <button onClick={handleEditToggle} className="btn">{isEditing ? 'Submit' : 'Edit Profile'}</button>
                            {isEditing && (<button onClick={handleCancel} className="btn cancel">Cancel</button>)}
                            {!isGoogleUser && (<button onClick={() => setShowPasswordModal(true)} disabled={isEditing} className="btn">Update Password</button>)}
                        </div>
                    </div>
                )}

                {/* SHOP TAB */}
                {activeTab === 'shop' && (
                    <div className="tab-content">
                        {/* BASIC */}
                        <div className="section">
                            <div className="section-header">
                                <h3>Basic Details</h3>
                                <button
                                    className="icon-btn"
                                    onClick={() => handleSectionEdit('basic')}
                                    title={sectionEdit.basic ? 'Cancel edit' : 'Edit Basic Details'}
                                >
                                    {sectionEdit.basic ? (
                                        <CancelOutlinedIcon size={22} />
                                    ) : (
                                        <EditIcon size={22} />
                                    )}
                                </button>
                            </div>

                            <div className="form-group inline">
                                <label>Shop Logo</label>
                                <input type="file" ref={shopLogoInputRef} style={{ display: 'none' }} onChange={handleShopLogoChange} accept="image/*" />
                                <img src={shopLogoPreview} alt="Shop Logo" className={`shop-logo ${sectionEdit.basic ? 'editable' : ''}`} onClick={() => { if (sectionEdit.basic) shopLogoInputRef.current.click(); }} />
                            </div>

                            <div className="form-group">
                                <label>Shop Name</label>
                                <input type="text" value={formData.shopName || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Address</label>
                                <input type="text" value={formData.shopAddress || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopAddress: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Pincode</label>
                                <input type="text" value={formData.shopPincode || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopPincode: e.target.value })} onBlur={handlePincodeBlur} />
                            </div>
                            <div className="form-group">
                                <label>City</label>
                                <input type="text" value={formData.shopCity || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopCity: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input type="text" value={formData.shopState || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopState: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Shop Slogan</label>
                                <input type="text" value={formData.shopSlogan || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopSlogan: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" value={formData.shopEmail || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopEmail: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Phone</label>
                                <input type="text" value={formData.shopPhone || ''} disabled={!sectionEdit.basic} onChange={e => setFormData({ ...formData, shopPhone: e.target.value })} />
                            </div>

                            {sectionEdit.basic && (<div className="section-actions"><button className="btn" onClick={() => handleSectionSave('basic')}>Save Basic Details</button><button className="btn btn-cancel" onClick={() => setSectionEdit(prev => ({ ...prev, basic: false }))}>Cancel</button></div>)}
                        </div>

                        {/* FINANCE */}
                        <div className="section">
                            <div className="section-header">
                                <h3>Finance Details</h3>

                                <button
                                    className="icon-btn"
                                    onClick={() => handleSectionEdit('finance')}
                                    title={sectionEdit.finance ? 'Cancel edit' : 'Edit Basic Details'}
                                >
                                    {sectionEdit.finance ? (
                                        <CancelOutlinedIcon size={22} />
                                    ) : (
                                        <EditIcon size={22} />
                                    )}
                                </button>


                            </div>

                            <div className="form-group">
                                <label>GSTIN</label>
                                <input type="text" value={formData.gstin || formData.gstNumber || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, gstin: e.target.value, gstNumber: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>PAN</label>
                                <input type="text" value={formData.pan || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, pan: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>UPI ID</label>
                                <input type="text" value={formData.upi || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, upi: e.target.value })} />
                            </div>

                            <h4>Bank Details</h4>
                            <div className="form-group">
                                <label>Account Holder Name</label>
                                <input type="text" value={formData.bankHolder || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankHolder: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Account Number</label>
                                <input type="text" value={formData.bankAccount || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankAccount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>IFSC Code</label>
                                <input type="text" value={formData.bankIfsc || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankIfsc: e.target.value })} onBlur={handleIFSCBlur} />
                            </div>
                            <div className="form-group">
                                <label>Bank Name</label>
                                <input type="text" value={formData.bankName || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankName: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Bank Address</label>
                                <input type="text" value={formData.bankAddress || ''} disabled={!sectionEdit.finance} onChange={e => setFormData({ ...formData, bankAddress: e.target.value })} />
                            </div>

                            {sectionEdit.finance && (<div className="section-actions"><button className="btn" onClick={() => handleSectionSave('finance')}>Save Finance Details</button><button className="btn btn-cancel" onClick={() => setSectionEdit(prev => ({ ...prev, finance: false }))}>Cancel</button></div>)}
                        </div>

                        {/* OTHERS */}
                        <div className="section">
                            <div className="section-header">
                                <h3>Others</h3>
                                <button
                                    className="icon-btn"
                                    onClick={() => handleSectionEdit('others')}
                                    title={sectionEdit.finance ? 'Cancel edit' : 'Edit Basic Details'}
                                >
                                    {sectionEdit.others ? (
                                        <CancelOutlinedIcon size={22} />
                                    ) : (
                                        <EditIcon size={22} />
                                    )}
                                </button>


                            </div>

                            <div className="form-group">
                                <label>
                                    Terms & Condition{" "}
                                    <span style={{ fontStyle: "italic", fontSize: "0.85em", color: "#777" }}>
            (If you want to insert more terms, separate them with <b>##</b> — e.g., Term1##Term2##Term3)
        </span>
                                </label>
                                <textarea
                                    value={formData.terms1 || ''}
                                    disabled={!sectionEdit.others}
                                    onChange={e => setFormData({ ...formData, terms1: e.target.value })}
                                />
                            </div>



                            {sectionEdit.others && (<div className="section-actions"><button className="btn" onClick={() => handleSectionSave('others')}>Save Other Details</button><button className="btn btn-cancel" onClick={() => setSectionEdit(prev => ({ ...prev, others: false }))}>Cancel</button></div>)}

                        </div>
                    </div>
                )}

                {/* PASSWORD MODAL (intact) */}
                {/* PASSWORD MODAL (intact) */}
                {showPasswordModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3 className="modal-title">
                                {passwordStep === 1 ? 'Enter Current Password' : 'Set New Password'}
                            </h3>

                            {passwordStep === 1 ? (
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={passwordData.currentPassword}
                                        onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="modal-actions">
                                <HoverButton onClick={handlePasswordSubmit}>
                                    {passwordStep === 1 ? 'Validate' : 'Submit'}
                                </HoverButton>
                                <HoverButton
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordStep(1);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </HoverButton>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfilePage;
