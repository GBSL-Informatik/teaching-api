import {RequestHandler} from "express";
import DocumentRoot from "../models/DocumentRoot";

export const find: RequestHandler<{ id: string }> = async (req, res, next) => {
    try {
        const document = await DocumentRoot.findModel(req.params.id);
        res.json(document);
    } catch (error) {
        next(error);
    }
};
