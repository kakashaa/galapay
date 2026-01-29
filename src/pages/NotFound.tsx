import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Auto redirect after countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [location.pathname, navigate]);

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted p-4" dir="rtl">
      <div className="text-center space-y-6 animate-fade-in">
        {/* Icon */}
        <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
          <Home className="w-12 h-12 text-primary" />
        </div>
        
        {/* Title */}
        <div>
          <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
          <p className="text-xl text-muted-foreground">الصفحة غير موجودة</p>
        </div>
        
        {/* Message */}
        <p className="text-muted-foreground max-w-sm mx-auto">
          عذراً، الصفحة التي تبحث عنها غير متوفرة. سيتم توجيهك للصفحة الرئيسية...
        </p>
        
        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 text-primary">
          <span className="text-2xl font-bold animate-pulse">{countdown}</span>
          <span className="text-sm">ثانية</span>
        </div>
        
        {/* Button */}
        <Button 
          onClick={handleGoHome}
          size="lg"
          className="gap-2"
        >
          <ArrowRight className="w-5 h-5" />
          العودة للرئيسية وبدء السحب
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
