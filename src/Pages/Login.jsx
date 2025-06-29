import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Mail,
  Lock,
  User,
  Phone,
  ChevronDown,
  CheckCircle,
  LogIn,
  UserPlus,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { authAPI, setAuthToken } from "../utils/Api";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "Customer",
    otp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpSession, setOtpSession] = useState(null); // Store session info for OTP verification
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  // Timer countdown for OTP resend
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOtpChange = (e) => {
    const value = e.target.value;
    // Allow only digits and limit to 6 characters
    if (/^\d*$/.test(value) && value.length <= 6) {
      setFormData((prev) => ({ ...prev, otp: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin && !showOtpStep) {
        // Step 1: Request OTP after password verification
        const { email, password } = formData;
        
        console.log("Requesting OTP for:", { email }); // Debug log
        
        const response = await authAPI.requestOtp({ email, password });
        
        console.log("OTP Request Response:", response); // Debug log
        
        // Store any session data returned from OTP request
        if (response.sessionToken || response.sessionId) {
          setOtpSession({
            sessionToken: response.sessionToken,
            sessionId: response.sessionId,
            email: email
          });
          toast.success("OTP request successful",response);
        }
        
        toast.success("OTP sent successfully! Please check your email/phone.");
        setShowOtpStep(true);
        setOtpTimer(60); // 60 seconds countdown
        
      } else if (isLogin && showOtpStep) {
        // Step 2: Verify OTP and complete login
        const { email, otp } = formData;
        
        // Validate OTP format
        if (!otp || otp.length !== 6) {
          throw new Error("Please enter a valid 6-digit OTP");
        }
        
        // Prepare OTP verification data - only email and otp as your backend expects
        const otpVerificationData = {
          email: email.trim().toLowerCase(), // Ensure consistent email format
          otp: otp.trim() // Remove any whitespace
        };
        
        console.log("Verifying OTP with data:", otpVerificationData); // Debug log
        
        toast.info("Verifying OTP...", { autoClose: 2000 });
        
        const response = await authAPI.verifyOtpAndLogin(otpVerificationData);
        
        console.log("OTP Verification Response:", response); // Debug log
        
        // Handle successful login
        // After successful OTP verification
        if (response && (response.token || response.success)) {
          // Check if we have the required data
          if (!response.token && !response.accessToken && !response.authToken) {
            throw new Error("No authentication token received from server");
          }
          
          if (!response.user && !response.userData) {
            throw new Error("No user information received from server");
          }
          
          // Handle different response formats
          const token = response.token || response.accessToken || response.authToken;
          const user = response.user || response.userData;
          
          // Log the token and user for debugging
          console.log("Setting auth token:", token);
          console.log("Setting user data:", user);
          
          // Add debug logging
          console.log("Authentication successful", {
            token: token,
            tokenLength: token?.length,
            user: user,
            localStorage: {
              token: localStorage.getItem("token"),
              user: localStorage.getItem("user")
            }
          });
          
          // Set auth token and user data
          setAuthToken(token);
          localStorage.setItem("user", JSON.stringify(user));
          localStorage.setItem("token", token);
          
          // Add a small delay to ensure localStorage is updated
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Verify the token was properly set
          const storedToken = localStorage.getItem("token");
          console.log("Stored token verification:", {
            tokenReceived: token,
            tokenStored: storedToken,
            match: storedToken === token
          });
          
          toast.success(`Welcome back, ${user.name || user.email}!`, { 
            autoClose: 3000,
            position: "top-right"
          });
          
          // Small delay to show success message
          setTimeout(() => {
            // Navigate based on user role
            const userRole = user?.role;
            console.log("Navigating based on role:", userRole);
            
            // Force a page reload to ensure fresh state
            if (userRole === "Admin") {
              window.location.href = "/admin-dashboard";
            } else if (userRole === "Customer") {
              window.location.href = "/customer-dashboard";
            } else if (userRole === "Driver") {
              window.location.href = "/driver-dashboard";
            } else if (userRole === "Accounts") {
              window.location.href = "/accounts-dashboard";
            } else if (userRole === "Reports & MIS") {
              window.location.href = "/reports-dashboard";
            } else {
              window.location.href = "/dashboard";
            }
          }, 1000);
        } else {
          console.error("Invalid response format:", response);
          throw new Error("Invalid response from server. Please try again.");
        }
        
      } else {
        // Handle Signup using the auth context
        const response = await signup(formData);

        toast.success(
          response.message || "Account created successfully! Please log in."
        );
        setIsLogin(true);
        setShowOtpStep(false);
        setOtpSession(null);
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "Customer",
          otp: "",
        });
      }
    } catch (err) {
      console.error("Authentication error:", err);
      
      // Enhanced error handling with better user feedback
      let errorMessage = "Authentication failed. Please try again.";
      
      if (typeof err === "string") {
        errorMessage = err;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      } else if (err.error) {
        errorMessage = err.error;
      }

      setError(errorMessage);
      
      // Show different toast messages based on the step
      if (showOtpStep) {
        toast.error(`OTP Verification Failed: ${errorMessage}`, {
          position: "top-right",
          autoClose: 5000,
        });
        
        // Clear OTP field for retry
        setFormData((prev) => ({ ...prev, otp: "" }));
        
        // If OTP is invalid/expired, show additional guidance
        if (errorMessage.toLowerCase().includes('otp') || 
            errorMessage.toLowerCase().includes('invalid') ||
            errorMessage.toLowerCase().includes('expired')) {
          toast.info("Please request a new OTP if the current one has expired", {
            position: "top-right",
            autoClose: 4000,
          });
        }
      } else {
        toast.error(`Login Failed: ${errorMessage}`, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    
    setLoading(true);
    setError("");

    try {
      const { email, password } = formData;
      
      console.log("Resending OTP for:", { email }); // Debug log
      
      toast.info("Sending new OTP...", { autoClose: 2000 });
      
      const response = await authAPI.requestOtp({ email, password });
      
      // Update session data if provided
      if (response.sessionToken || response.sessionId) {
        setOtpSession({
          sessionToken: response.sessionToken,
          sessionId: response.sessionId,
          email: email
        });
      }
      
      toast.success("New OTP sent successfully! Please check your email/phone.", {
        position: "top-right",
        autoClose: 4000,
      });
      setOtpTimer(60); // Reset timer
      setFormData((prev) => ({ ...prev, otp: "" })); // Clear previous OTP
    } catch (err) {
      console.error("Resend OTP error:", err);
      
      let errorMessage = "Failed to resend OTP.";
      if (typeof err === "string") {
        errorMessage = err;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(`Resend Failed: ${errorMessage}`, {
        position: "top-right",
        autoClose: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setShowOtpStep(false);
    setOtpSession(null);
    setFormData((prev) => ({ ...prev, otp: "" }));
    setError("");
    setOtpTimer(0);
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setShowOtpStep(false);
    setOtpSession(null);
    setError("");
    setOtpTimer(0);
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: "Customer",
      otp: "",
    });
  };

  const roles = ["Admin", "Accounts", "Reports & MIS", "Customer", "Driver"];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="flex flex-col w-full md:w-1/2 bg-white">
        <div className="flex flex-grow items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
                {showOtpStep ? (
                  <Shield className="w-8 h-8" />
                ) : (
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    ></path>
                  </svg>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-800">
                Fleet Management
              </h1>
              <p className="text-gray-500 mt-2">
                {showOtpStep
                  ? "Enter the OTP sent to your email/phone"
                  : isLogin
                  ? "Sign in to your account"
                  : "Create a new account"}
              </p>
            </div>

            {/* Auth Tabs - Hide during OTP step */}
            {!showOtpStep && (
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`w-1/2 py-2 text-sm font-medium rounded-md transition-all ${
                    isLogin
                      ? "bg-white shadow text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center justify-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </span>
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`w-1/2 py-2 text-sm font-medium rounded-md transition-all ${
                    !isLogin
                      ? "bg-white shadow text-blue-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center justify-center">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Sign Up
                  </span>
                </button>
              </div>
            )}

            {/* Back button for OTP step */}
            {showOtpStep && (
              <button
                onClick={handleBackToPassword}
                className="flex items-center text-blue-600 hover:text-blue-500 mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to login
              </button>
            )}
            
            
            {error && (
              <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Show OTP input during OTP step */}
              {showOtpStep ? (
                <div>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Enter OTP
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={formData.otp}
                      onChange={handleOtpChange}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      required
                      autoComplete="one-time-code"
                    />
                  </div>
                  <div className="mt-2 flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      OTP sent to {formData.email}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={otpTimer > 0 || loading}
                      className={`text-blue-600 hover:text-blue-500 ${
                        (otpTimer > 0 || loading) && "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {otpTimer > 0 ? `Resend in ${otpTimer}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Regular form fields */}
                  {!isLogin && (
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="John Doe"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                              setFormData((prev) => ({ ...prev, phone: value }));
                            }
                          }}
                          className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter phone number"
                          maxLength={10}
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  )}

                  {!isLogin && (
                    <div>
                      <label
                        htmlFor="role"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Role
                      </label>
                      <div className="relative">
                        <select
                          id="role"
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none focus:ring-blue-500 focus:border-blue-500"
                          required={!isLogin}
                        >
                          <option value="" disabled>
                            Select Role
                          </option>
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {isLogin && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor="remember-me"
                          className="ml-2 block text-sm text-gray-700"
                        >
                          Remember me
                        </label>
                      </div>
                      <div className="text-sm">
                        <button
                          type="button"
                          className="font-medium text-blue-600 hover:text-blue-500"
                          onClick={() =>
                            toast.info("Password reset functionality coming soon!")
                          }
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading || (showOtpStep && formData.otp.length !== 6)}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    (loading || (showOtpStep && formData.otp.length !== 6)) && "opacity-75 cursor-not-allowed"
                  }`}
                >
                  {loading
                    ? "Processing..."
                    : showOtpStep
                    ? "Verify OTP & Sign In"
                    : isLogin
                    ? "Continue with OTP"
                    : "Create Account"}
                </button>
              </div>
            </form>

            {!showOtpStep && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={toggleAuthMode}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    {isLogin ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Fleet Management System. All rights
          reserved.
        </div>
      </div>

      {/* Image/Background Section - Hidden on mobile */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600">
        <div className="flex items-center justify-center w-full h-full p-12">
          <div className="text-white max-w-md">
            <h2 className="text-3xl font-bold mb-6">
              {showOtpStep ? "Secure OTP Verification" : "Manage Your Fleet with Confidence"}
            </h2>
            <p className="text-blue-100 mb-6">
              {showOtpStep
                ? "We've sent a one-time password (OTP) to your registered email/phone for enhanced security."
                : "Our comprehensive fleet management system helps you track vehicles, manage drivers, and optimize routes for maximum efficiency."}
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 mr-3 text-blue-200 flex-shrink-0" />
                <p className="text-blue-100">
                  {showOtpStep
                    ? "Two-factor authentication for enhanced security"
                    : "Real-time vehicle tracking and analytics"}
                </p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 mr-3 text-blue-200 flex-shrink-0" />
                <p className="text-blue-100">
                  {showOtpStep
                    ? "OTP expires in 10 minutes for your protection"
                    : "Comprehensive maintenance scheduling"}
                </p>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 mr-3 text-blue-200 flex-shrink-0" />
                <p className="text-blue-100">
                  {showOtpStep
                    ? "Secure access to your fleet management dashboard"
                    : "Detailed reporting and fleet performance metrics"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


