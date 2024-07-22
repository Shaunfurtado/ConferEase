import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';

const NicknameModal = ({ isOpen, setIsOpen, nickname, setNickname, joinSession }) => {
    return (
        <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg">
                    <Dialog.Title className="text-2xl mb-4">Enter your nickname</Dialog.Title>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Nickname"
                        className="p-2 border border-gray-300 rounded mb-4 w-full"
                    />
                    <button onClick={joinSession} 
                    className="bg-blue-500 text-white py-2 px-4 rounded w-full mb-4 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                        Join Session
                    </button>
                    <Dialog.Close asChild>
                        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                            <Cross2Icon />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default NicknameModal;