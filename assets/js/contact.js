/* Contact form placeholder. Replace with your real API/email endpoint. */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Connect this form to your email/API endpoint.");
  });
});
