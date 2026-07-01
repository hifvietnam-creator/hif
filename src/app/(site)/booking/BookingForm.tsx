"use client";

import { FormEvent } from "react";

export default function BookingForm() {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value || "";
    const org = (form.elements.namedItem("org") as HTMLInputElement)?.value || "";
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value || "";
    const phone = (form.elements.namedItem("phone") as HTMLInputElement)?.value || "";
    const space = (form.elements.namedItem("space") as HTMLInputElement)?.value || "";
    const date = (form.elements.namedItem("date") as HTMLInputElement)?.value || "";
    const time = (form.elements.namedItem("time") as HTMLInputElement)?.value || "";
    const people = (form.elements.namedItem("people") as HTMLInputElement)?.value || "";
    const details = (form.elements.namedItem("details") as HTMLTextAreaElement)?.value || "";
    const subject = encodeURIComponent(`Facility booking request from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nOrganisation: ${org}\nEmail: ${email}\nPhone: ${phone}\n\nSpace: ${space}\nDate(s): ${date}\nTime: ${time}\nAttendance: ${people}\n\nDetails:\n${details}`
    );
    window.location.href = `mailto:admin@hif.vn?subject=${subject}&body=${body}`;
  }

  return (
    <form id="bookingForm" className="contact-form" noValidate onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor="bf-name">Your name</label>
        <input id="bf-name" name="name" type="text" autoComplete="name" placeholder="First and last name" required />
      </div>
      <div className="form-row">
        <label htmlFor="bf-org">Organisation / group</label>
        <input id="bf-org" name="org" type="text" autoComplete="organization" placeholder="Church, charity, or group name" />
      </div>
      <div className="form-row">
        <label htmlFor="bf-email">Email</label>
        <input id="bf-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div className="form-row">
        <label htmlFor="bf-phone">Phone</label>
        <input id="bf-phone" name="phone" type="tel" autoComplete="tel" placeholder="Best number to reach you" />
      </div>
      <div className="form-row">
        <label htmlFor="bf-space">Space / location</label>
        <input id="bf-space" name="space" type="text" placeholder="e.g. HIF Hanoi (Detech) — main hall / a meeting room" />
      </div>
      <div className="form-row">
        <label htmlFor="bf-date">Date(s) needed</label>
        <input id="bf-date" name="date" type="text" placeholder="e.g. Saturday 12 July, or a recurring day" required />
      </div>
      <div className="form-row">
        <label htmlFor="bf-time">Time (start to end)</label>
        <input id="bf-time" name="time" type="text" placeholder="e.g. 2:00pm – 5:00pm" />
      </div>
      <div className="form-row">
        <label htmlFor="bf-people">Expected attendance</label>
        <input id="bf-people" name="people" type="text" inputMode="numeric" placeholder="Roughly how many people?" />
      </div>
      <div className="form-row">
        <label htmlFor="bf-details">Purpose / details</label>
        <textarea id="bf-details" name="details" placeholder="Tell us a little about your event and anything you'll need (chairs, sound, projector, etc.)."></textarea>
      </div>
      <button className="btn btn-primary btn-lg" type="submit">Send booking request</button>
    </form>
  );
}
