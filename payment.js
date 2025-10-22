const stripe = Stripe('pk_live_51SKj95CTzSUDvKI7szZFPUscZmvGyYbUNs2S1mTUCtKOHx6ciT645T7t7aE0Jk7kSrmDvIax44q4bmQbI7g2ZMTE00G9lOsKM4');
const elements = stripe.elements();

// Create card element with postal code hidden
const cardElement = elements.create('card', {
  hidePostalCode: true,
  style: {
    base: {
      fontSize: '16px',
      color: '#32325d',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
  }
});

cardElement.mount('#card-element');

cardElement.on('change', (event) => {
  const submitButton = document.getElementById('submit');
  submitButton.disabled = !event.complete;
  showMessage(event.error ? event.error.message : '');
});

const form = document.getElementById('payment-form');
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const amount = document.getElementById('amount').value;
  if (!amount || amount < 50) {
    showMessage('Please enter a valid amount (at least 50 cents).');
    return;
  }
  
  const submitButton = document.getElementById('submit');
  submitButton.disabled = true;
  submitButton.textContent = 'Processing...';
  
  try {
    // MAKE SURE THIS URL HAS /create-payment-intent AT THE END
    const workerURL = 'https://payment-handler.oliverlebaigue.workers.dev/create-payment-intent';
    
    const response = await fetch(workerURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseInt(amount), currency: 'usd' })
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: { 
        card: cardElement
      }
    });
    
    if (confirmError) {
      throw new Error(confirmError.message);
    } else {
      showMessage('Payment succeeded!', 'success');
      form.reset();
      cardElement.clear();
    }
  } catch (error) {
    showMessage(error.message, 'error');
    console.error('Payment error:', error);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Pay Now';
  }
});

function showMessage(message, type = 'error') {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.textContent = message;
  messagesDiv.style.color = type === 'success' ? 'green' : 'red';
}