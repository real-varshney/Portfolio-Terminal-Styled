import { Terminal } from "xterm";

const TypeAnimation = (term: Terminal, input: string | string[]) => {
  let skipAnimation = false;

  const messages = Array.isArray(input) ? input : [input];

  const skipHandler = () => {
    console.log("Skip handler called");
    skipAnimation = true;
  };

  const animationPromise = (async () => {
    let messageIndex = 0;
    for (const message of messages) {
      if (skipAnimation) {
        // Write all remaining messages instantly as complete strings
        for (let i = messageIndex; i < messages.length; i++) {
          const completeMsg = messages[i];
          term.write(completeMsg);
          if (i < messages.length - 1) term.write("\r\n");
        }
        return;
      }

      let charIndex = 0;
      for (const char of message) {
        if (skipAnimation) {
          // Write remaining chars of current message and all remaining messages
          const remainingChars = message.substring(charIndex);
          term.write(remainingChars);
          term.write("\r\n");
          // Write all remaining messages
          for (let i = messageIndex + 1; i < messages.length; i++) {
            term.write(messages[i]);
            if (i < messages.length - 1) term.write("\r\n");
          }
          return;
        }
        term.write(char);
        charIndex++;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      term.write("\r\n");
      if (!skipAnimation) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      messageIndex++;
    }
  })();

  return { promise: animationPromise, skip: skipHandler };
};

export default TypeAnimation;
