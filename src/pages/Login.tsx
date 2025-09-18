// src/components/auth/AuthPage.tsx - Static design only
import React, { useState } from 'react';
import { BookOpen, Zap, Users, Shield } from 'lucide-react';
import LoginForm from '../components/auth/loginForm';
import RegisterForm from '../components/auth/RegisterForm';

const Login: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-blue-700 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg">
                <BookOpen className="h-7 w-7 text-white" strokeWidth={1.6} />
              </div>
              <h1 className="text-2xl font-bold">Dotivra </h1>
            </div>
            <h2 className="text-3xl font-bold mb-4">
              AI-Powered Documentation Made Simple
            </h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Create, manage, and enhance your developer documentation with the power of artificial intelligence. 
              Collaborate seamlessly and build better docs faster.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Zap className="h-5 w-5 text-white" strokeWidth={1.6} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI Writing Assistant</h3>
                <p className="text-blue-100 text-sm">Get intelligent suggestions and generate documentation content with AI</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Users className="h-5 w-5 text-white" strokeWidth={1.6} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Team Collaboration</h3>
                <p className="text-blue-100 text-sm">Work together on documentation projects with real-time collaboration</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Shield className="h-5 w-5 text-white" strokeWidth={1.6} />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Secure & Reliable</h3>
                <p className="text-blue-100 text-sm">Your documentation is secure with enterprise-grade protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication Forms */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="h-7 w-7 text-white" strokeWidth={1.6} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Documentation Hub</h1>
            </div>
          </div>

          {/* Forms */}
          {isLoginMode ? (
            <LoginForm onToggleMode={toggleMode} />
          ) : (
            <RegisterForm onToggleMode={toggleMode} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
