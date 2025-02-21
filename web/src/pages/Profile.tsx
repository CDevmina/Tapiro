import { useUserService } from "@/services/userService";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const Profile = () => {
  const { getUserProfile, deleteUserProfile } = useUserService();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getUserProfile();
        setProfile(response.data);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
  }, [getUserProfile]);

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      try {
        setIsDeleting(true);
        await deleteUserProfile();
        await logout();
        navigate("/");
      } catch (error) {
        console.error("Failed to delete account:", error);
        alert("Failed to delete account. Please try again.");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold">Profile</h1>
      {profile && (
        <div className="mt-4">{/* Display profile information */}</div>
      )}
      <div className="mt-8">
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </div>
  );
};

export default Profile;
