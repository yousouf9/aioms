const BASE_URL = process.env.VALUEPAY_BASE_URL ?? "https://valuepay.konplit.com/v1";
const PRIVATE_KEY = process.env.VALUEPAY_PRIVATE_KEY ?? "";

interface InitTransactionParams {
  transactionRef: string;
  redirectUrl: string;
  amount: number;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  customerFullName: string;
}

interface InitTransactionResult {
  paymentUrl: string;
  valueRef: string;
  transactionRef: string;
}

export async function initTransaction(
  params: InitTransactionParams
): Promise<InitTransactionResult | null> {
  try {
    const res = await fetch(`${BASE_URL}/transactions/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PRIVATE_KEY}`,
      },
      body: JSON.stringify({
        transactionRef: params.transactionRef,
        redirectUrl: params.redirectUrl,
        currency: "NGN",
        amount: params.amount,
        channels: ["card", "transfer", "ussd", "qrcode"],
        customer: {
          email: params.customerEmail,
          firstName: params.customerFirstName,
          lastName: params.customerLastName,
          fullName: params.customerFullName,
        },
      }),
    });

    const data = await res.json();

    if (data.status === "Success" && data.data?.paymentUrl) {
      return {
        paymentUrl: data.data.paymentUrl,
        valueRef: data.data.valueRef,
        transactionRef: data.data.transactionRef,
      };
    }

    console.error("[VALUEPAY_INIT]", data);
    return null;
  } catch (error) {
    console.error("[VALUEPAY_INIT_ERROR]", error);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function verifyTransaction(transactionRef: string): Promise<any | null> {
  try {
    const res = await fetch(`${BASE_URL}/transactions/${transactionRef}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PRIVATE_KEY}`,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.data ?? data ?? null;
  } catch (error) {
    console.error("[VALUEPAY_VERIFY_ERROR]", error);
    return null;
  }
}
