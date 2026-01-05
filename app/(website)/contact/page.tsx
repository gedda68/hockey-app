export default function ContactPage() {
  // This is a Server Action
  async function handleSubmit(formData: FormData) {
    "use server";

    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    };

    // In a real app, you'd send this to Resend, SendGrid, or your DB
    console.log("Form Submission:", data);
  }

  return (
    <section className="py-16 max-w-2xl mx-auto px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black">Get in touch</h1>
        <p className="text-base-content/60 mt-2">
          Have a question or want to work together? Send us a message.
        </p>
      </div>

      <div className="card bg-base-200 shadow-sm">
        <form action={handleSubmit} className="card-body gap-4">
          {/* Name Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Full Name</span>
            </label>
            <input
              name="name"
              type="text"
              placeholder="John Doe"
              className="input input-bordered focus:input-primary"
              required
            />
          </div>

          {/* Email Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Email Address</span>
            </label>
            <input
              name="email"
              type="email"
              placeholder="john@example.com"
              className="input input-bordered focus:input-primary"
              required
            />
          </div>

          {/* Message Field */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Message</span>
            </label>
            <textarea
              name="message"
              className="textarea textarea-bordered h-32 focus:textarea-primary"
              placeholder="How can we help?"
              required
            ></textarea>
          </div>

          <div className="form-control mt-6">
            <button type="submit" className="btn btn-primary">
              Send Message
            </button>
          </div>
        </form>
      </div>

      {/* Quick Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-base-100 border border-base-300">
          <div className="bg-primary/10 p-3 rounded-lg text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold">Email</h3>
            <p className="text-sm text-base-content/60">hello@example.com</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-base-100 border border-base-300">
          <div className="bg-secondary/10 p-3 rounded-lg text-secondary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold">Office</h3>
            <p className="text-sm text-base-content/60">
              Aspley, QLD, Australia
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
