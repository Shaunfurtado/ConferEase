
import Modal from 'react-modal';

const ModalComponent = ({ isOpen, closeModal, joinSession, nickname, setNickname }) => {
    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={closeModal}
            contentLabel="Enter Nickname"
            ariaHideApp={false}
        >
            <div className="flex flex-col items-center">
                <h2 className="text-2xl mb-4">Enter your nickname</h2>
                <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Nickname"
                    className="p-2 border border-gray-300 rounded mb-4"
                />
                <button
                    onClick={joinSession}
                    className="bg-blue-500 text-white py-2 px-4 rounded"
                >
                    Join Session
                </button>
            </div>
        </Modal>
    );
};

export default ModalComponent;
