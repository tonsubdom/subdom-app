import { List, Text } from "@telegram-apps/telegram-ui";
import { useTheme } from '@/contexts/ThemeContext';
import tonFooterSvg from "./ton.svg";

const Footer = () => {
  const { currentTheme } = useTheme();
  
  const footerColors = {
    light: {
      background: "#ffffff",
      text: "#6B7280",
      hint: "#9CA3AF"
    },
    dark: {
      background: "#121212",
      text: "#D1D5DB",
      hint: "#6B7280"
    }
  };

  const colors = footerColors[currentTheme === 'dark' ? "dark" : "light"];

  return (
    <div style={{ 
      position: "fixed",
      bottom: 0,
      width: "100vw", 
      marginTop: '80px'
    }}>
      <List
        style={{
          padding: "20px",
          backgroundColor: colors.background,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Text style={{ 
              fontSize: "12px", 
              color: colors.hint, 
              fontWeight: "bold" 
            }}>
              BASED ON
            </Text>
            <img src={tonFooterSvg} alt="TON Logo" style={{ width: "24px", height: "24px" }} />
            <Text style={{ 
              fontSize: "12px", 
              color: colors.hint, 
              fontWeight: "bold" 
            }}>
              DNS
            </Text>
          </div>
          <Text style={{ 
            fontSize: "12px", 
            color: colors.hint 
          }}>
            {new Date().getFullYear()} © TON DNS subdomains
          </Text>
        </div>
      </List>
    </div>
  );
};

export default Footer;
