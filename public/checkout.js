// public/checkout.js

// 1) Initialize Stripe
const stripe = Stripe("{{YOUR_STRIPE_PUBLISHABLE_KEY}}"); // replace in Vercel later
let elements, paymentElement;

async function setupStripePayment() {
    // Create a PaymentIntent on the server
    const resp = await fetch("/api/stripe-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            amount: 1700, // $17.00 in cents
            receipt_email: document.getElementById("email").value,
        }),
    });
    const { clientSecret } = await resp.json();

    // Mount the Payment Element
    elements = stripe.elements({ clientSecret });
    paymentElement = elements.create("payment");
    paymentElement.mount("#stripe-element");

    // Enable the “Pay” button once ready
    document.getElementById("stripe-pay-btn").disabled = false;
}

// 2) Handle Stripe “Pay” click
document.getElementById("stripe-pay-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    document.getElementById("stripe-pay-btn").disabled = true;

    const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
            return_url: window.location.href,
        },
    });
    if (error) {
        alert(error.message);
        document.getElementById("stripe-pay-btn").disabled = false;
    }
});

// 3) Initialize PayPal Buttons
paypal.Buttons({
    style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
    createOrder: async (data, actions) => {
        const resp = await fetch("/api/paypal-create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                amount: "17.00",
                currency: "USD",
                email: document.getElementById("email").value,
            }),
        });
        const { orderID } = await resp.json();
        return orderID;
    },
    onApprove: async (data, actions) => {
        const resp = await fetch("/api/paypal-capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: data.orderID }),
        });
        const result = await resp.json();
        if (result.error) {
            alert("PayPal capture failed");
        } else {
            alert("Thank you! Payment completed.");
        }
    },
    onError: (err) => {
        console.error(err);
        alert("PayPal error: " + err);
    },
}).render("#paypal-button-container");

// 4) Kick off Stripe setup once the email field loses focus
document.getElementById("email").addEventListener("blur", () => {
    if (!elements) setupStripePayment();
});