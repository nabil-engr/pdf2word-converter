document.addEventListener("DOMContentLoaded", () => {
  const navigation = document.querySelector(".nav-links");
  if (navigation) {
    navigation.setAttribute("aria-label", "Main navigation");
    navigation.id ||= "main-navigation";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "menu-btn";
    menuButton.setAttribute("aria-controls", navigation.id);
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation menu");
    menuButton.textContent = "☰";
    navigation.parentElement.append(menuButton);

    const closeMenu = () => {
      navigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.setAttribute("aria-label", "Open navigation menu");
      menuButton.textContent = "☰";
    };

    menuButton.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Close navigation menu" : "Open navigation menu",
      );
      menuButton.textContent = isOpen ? "×" : "☰";
    });

    navigation.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  const year = String(new Date().getFullYear());
  document.querySelectorAll(".footer-bottom").forEach((footer) => {
    footer.textContent = footer.textContent.replace(/\b20\d{2}\b/, year);
  });
});
