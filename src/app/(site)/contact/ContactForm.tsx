"use client";

import { FormEvent } from "react";

export default function ContactForm() {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value || "";
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value || "";
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement)?.value || "";
    const subject = encodeURIComponent(`Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:admin@hif.vn?subject=${subject}&body=${body}`;
  }

  return (
    <form id="contactForm" className="contact-form" noValidate onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="cf-name">Your name</label>
        <input id="cf-name" name="name" type="text" autoComplete="name" placeholder="First and last name" required />
      </div>
      <div className="form-row">
        <label htmlFor="cf-email">Email</label>
        <input id="cf-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
      </div>
      <div className="form-row">
        <label htmlFor="cf-message">Message</label>
        <textarea id="cf-message" name="message" placeholder="How can we help?" required></textarea>
      </div>
      <button className="btn btn-primary btn-lg" type="submit">Send message</button>
    </form>
  );
}
