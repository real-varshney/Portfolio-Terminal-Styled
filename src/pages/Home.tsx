import { useEffect, useState } from "react";
import Terminal from "../components/TerminalComponent";
import { motion } from "framer-motion";
import { div } from "framer-motion/client";

const Home = () => {
  const [showArrow, setShowArrow] = useState(true);
  const fullName = "Vishal Varshney";
  const [typedName, setTypedName] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setShowArrow((prev) => !prev);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let i = 0;
    setTypedName(""); 
    const typingInterval = setInterval(() => {
      if (i < fullName.length) {
        setTypedName(fullName.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, 100);

    return () => clearInterval(typingInterval);
  }, []);

  return (
    <div className="dark:bg-[#0D1117] h-screen w-screen flex justify-center items-center">
        <Terminal />
    </div>
  );
};

export default Home;
