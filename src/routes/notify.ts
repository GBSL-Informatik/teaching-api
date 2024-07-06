/* istanbul ignore file */

import { Server } from 'socket.io';
import { ChangedRecord, IoEvent, RecordType } from './socketEventTypes';

export const notify = (io: Server | undefined, type: IoEvent, payload: Object, to?: string) => {
    if (!io) {
        return;
    }

    if (to) {
        io.to(to).emit(type, payload);
    } else {
        io.emit(type, payload);
    }
};

export const notifyChangedRecord = (
    io: Server | undefined,
    payload: ChangedRecord<RecordType>,
    to?: string
) => {
    notify(io, IoEvent.CHANGED_RECORD, payload, to);
};
