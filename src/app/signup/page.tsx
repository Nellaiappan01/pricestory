export default function SignupPage({ searchParams }: { searchParams: { plan?: string } }) {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-bold mb-4">Sign Up</h1>
      <p className="text-gray-600">
        You selected: <strong>{searchParams.plan || "No plan"}</strong>
      </p>
      {/* TODO: Add your real signup form here */}
    </div>
  );
}
