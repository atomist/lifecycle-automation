/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SlackMessage } from "@atomist/slack-messages";
import "mocha";
import * as assert from "power-assert";
import { AttachImagesNodeRenderer } from "../../../lib/lifecycle/rendering/AttachImagesNodeRenderer";

describe("AttachImagesNodeRenderer", () => {

    it("correctly attach 1 image", done => {

        const renderer = new AttachImagesNodeRenderer();
        const node = {
            body: "This is some basic embedded image https://image.com/folder/test.png within some text",
        };
        const msg: SlackMessage = {
            attachments: [],
        };

        renderer.render(node, [], msg, null)
            .then(rm => {
                assert(rm.attachments.length === 1);
                assert(rm.attachments[0].text === "test.png");
                assert(rm.attachments[0].image_url === "https://image.com/folder/test.png");
            })
            .then(done, done);
    });

    it("correctly attach 1 image from a link", done => {

        const renderer = new AttachImagesNodeRenderer();
        const node = {
            body: "![https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif]" +
            "(https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif)",
        };
        const msg: SlackMessage = {
            attachments: [],
        };

        renderer.render(node, [], msg, null)
            .then(rm => {
                assert(rm.attachments.length === 1);
                assert(rm.attachments[0].text === "giphy.gif");
                assert(rm.attachments[0].image_url === "https://media2.giphy.com/media/qilPKODIJZUgo/giphy.gif");
            })
            .then(done, done);
    });

    it("correctly attach multiple images", done => {

        const renderer = new AttachImagesNodeRenderer();
        const node = {
            body: "This is some basic embedded image" +
            " https://image.com/folder/test1.png within http://image.de/test2.png some text",
        };

        const msg: SlackMessage = {
            attachments: [],
        };

        renderer.render(node, [], msg, null)
            .then(rm => {
                assert(rm.attachments.length === 2);
                assert(rm.attachments[0].text === "test1.png");
                assert(rm.attachments[0].image_url === "https://image.com/folder/test1.png");
                assert(rm.attachments[1].text === "test2.png");
                assert(rm.attachments[1].image_url === "http://image.de/test2.png");
            })
            .then(done, done);
    });

    it("correctly attach multiple images embedded in markdown", done => {

        const renderer = new AttachImagesNodeRenderer();
        const node = {
            body: "This is some basic embedded image " +
            "<https://image.com/folder/test1.png|test1> within <http://image.de/test2.png|test2> some text",
        };

        const msg: SlackMessage = {
            attachments: [],
        };

        renderer.render(node, [], msg, null)
            .then(rm => {
                assert(rm.attachments.length === 2);
                assert(rm.attachments[0].text === "test1.png");
                assert(rm.attachments[0].image_url === "https://image.com/folder/test1.png");
                assert(rm.attachments[1].text === "test2.png");
                assert(rm.attachments[1].image_url === "http://image.de/test2.png");
            })
            .then(done, done);
    });

    it("correctly attach multiple images embedded in html", done => {

        const renderer = new AttachImagesNodeRenderer();
        const node = {
            body: "This is some basic embedded image " +
            "<img src='https://image.com/folder/test1.png'>test1</img> " +
            "within <img src='http://image.de/test2.png'>test2</img> some text",
        };

        const msg: SlackMessage = {
            attachments: [],
        };

        renderer.render(node, [], msg, null)
            .then(rm => {
                assert(rm.attachments.length === 2);
                assert(rm.attachments[0].text === "test1.png");
                assert(rm.attachments[0].image_url === "https://image.com/folder/test1.png");
                assert(rm.attachments[1].text === "test2.png");
                assert(rm.attachments[1].image_url === "http://image.de/test2.png");
            })
            .then(done, done);
    });

});
