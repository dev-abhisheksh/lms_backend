import { Notification } from "../models/notification.model.js";

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipient: req.user._id,
            isRead: false
        });

        res.status(200).json({
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error("Get Notifications Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndUpdate(id, { isRead: true });
        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Mark Notification Read Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Mark All Read Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndDelete({ _id: id, recipient: req.user._id });
        res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Delete Notification Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
