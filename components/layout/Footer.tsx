import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer sm:footer-horizontal p-10 text-indigo-400 bg-[#06054e]">
      <nav>
        <h6 className="footer-title">Services</h6>
        <a className="link link-hover">Branding</a>
        <a className="link link-hover">Design</a>
      </nav>
      <nav>
        <h6 className="footer-title">Company</h6>
        <a className="link link-hover">About us</a>

        <Link href="/contact">Contact</Link>
      </nav>
      <nav>
        <h6 className="footer-title">Legal</h6>
        <a className="link link-hover">Terms of use</a>
        <a className="link link-hover">Privacy policy</a>
      </nav>
    </footer>
  );
}
