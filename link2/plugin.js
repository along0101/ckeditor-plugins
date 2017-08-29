/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

'use strict';

(function () {
    CKEDITOR.plugins.add('link2', {
        requires: 'dialog',
        lang: 'zh-cn',
        init: function (editor) {
            var allowed = 'a[!href,target]', required = 'a[href]';

            // Add the link and unlink buttons.
            editor.addCommand('link2', new CKEDITOR.dialogCommand('link2Dialog', {
                allowedContent: allowed,
                requiredContent: required
            }));
            editor.addCommand('unlink', new CKEDITOR.unlinkCommand());

            editor.ui.addButton('Link2', {
                label: editor.lang.link2.toolbar,
                command: 'link2',
                icon: this.path + 'icons/link.png',
                toolbar: 'links,10'
            });
            editor.ui.addButton( 'Unlink', {
                label: editor.lang.link2.unlink,
                command: 'unlink',
                icon: this.path + 'icons/unlink.png',
                toolbar: 'links,20'
            } );

            CKEDITOR.dialog.add('link2Dialog', this.path + 'dialogs/link2.js');

            editor.on('doubleclick', function (evt) {
                // If the link has descendants and the last part of it is also a part of a word partially
                // unlinked, clicked element may be a descendant of the link, not the link itself. (#11956)
                var element = CKEDITOR.plugins.link2.getSelectedLink(editor) || evt.data.element.getAscendant('a', 1);

                if (element && !element.isReadOnly()) {
                    if (element.is('a')) {
                        evt.data.dialog = 'link2Dialog';
                        evt.data.link = element;
                    }
                }
            }, null, null, 0);

            // If event was cancelled, link passed in event data will not be selected.
            editor.on('doubleclick', function (evt) {
                // Make sure both links and anchors are selected (#11822).
                if (evt.data.dialog == 'link2Dialog' && evt.data.link)
                    editor.getSelection().selectElement(evt.data.link);
            }, null, null, 20);

            editor.addMenuItems({
                link: {
                    label: editor.lang.link.menu,
                    command: 'link2',
                    group: 'link',
                    order: 1
                },
                unlink: {
                    label: editor.lang.link.unlink,
                    command: 'unlink',
                    group: 'link',
                    order: 5
                }
            });
        }
    });

    /**
     * Set of Link plugin helpers.
     *
     * @class
     * @singleton
     */
    CKEDITOR.plugins.link2 = {
        /**
         * Get the surrounding link element of the current selection.
         *
         *        CKEDITOR.plugins.link.getSelectedLink( editor );
         *
         *        // The following selections will all return the link element.
         *
         *        <a href="#">li^nk</a>
         *        <a href="#">[link]</a>
         *        text[<a href="#">link]</a>
         *        <a href="#">li[nk</a>]
         *        [<b><a href="#">li]nk</a></b>]
         *        [<a href="#"><b>li]nk</b></a>
         *
         * @since 3.2.1
         * @param {CKEDITOR.editor} editor
         */
        getSelectedLink: function (editor) {
            var selection = editor.getSelection();
            var selectedElement = selection.getSelectedElement();
            if (selectedElement && selectedElement.is('a'))
                return selectedElement;

            var range = selection.getRanges()[0];

            if (range) {
                range.shrink(CKEDITOR.SHRINK_TEXT);
                return editor.elementPath(range.getCommonAncestor()).contains('a', 1);
            }
            return null;
        },

        /**
         * Parses attributes of the link element and returns an object representing
         * the current state (data) of the link. This data format is a plain object accepted
         * e.g. by the Link dialog window and {@link #getLinkAttributes}.
         *
         * **Note:** Data model format produced by the parser must be compatible with the Link
         * plugin dialog because it is passed directly to {@link CKEDITOR.dialog#setupContent}.
         *
         * @since 4.4
         * @param {CKEDITOR.editor} editor
         * @param {CKEDITOR.dom.element} element
         * @returns {Object} An object of link data.
         */
        parseLinkAttributes: function (editor, element) {
            var href = ( element && ( element.data('cke-saved-href') || element.getAttribute('href') ) ) || '',
                target = element && element.getAttribute('target') || '_blank',
                urlMatch, urlRegex = /^((?:http|https|ftp|news):\/\/)?(.*)$/,
                retval = {};

            // urlRegex matches empty strings, so need to check for href as well.
            if (href && ( urlMatch = href.match(urlRegex) )) {
                retval.target = target;
                retval.protocol = urlMatch[1];
                retval.url = href;
            }

            return retval;
        },
        /**
         * Converts link data produced by {@link #parseLinkAttributes} into an object which consists
         * of attributes to be set (with their values) and an array of attributes to be removed.
         * This method can be used to compose or to update any link element with the given data.
         *
         * @since 4.4
         * @param {CKEDITOR.editor} editor
         * @param {Object} data Data in {@link #parseLinkAttributes} format.
         * @returns {Object} An object consisting of two keys, i.e.:
         *
         *        {
		 *			// Attributes to be set.
		 *			set: {
		 *				href: 'http://foo.bar',
		 *				target: 'bang'
		 *			},
		 *			// Attributes to be removed.
		 *			removed: [
		 *				'id', 'style'
		 *			]
		 *		}
         *
         */
        getLinkAttributes: function (editor, data) {
            var set = {};

            set['data-cke-saved-href'] = data.url ? data.url : '';

            // Browser need the "href" fro copy/paste link to work. (#6641)
            if (set['data-cke-saved-href'])
                set.href = set['data-cke-saved-href'];

            set.target = data.target;

            var removed = {
                onclick: 1,
                'data-cke-pa-onclick': 1,
                'data-cke-saved-name': 1,
                'download': 1
            };

            // Remove all attributes which are not currently set.
            for (var s in set)
                delete removed[s];

            return {
                set: set,
                removed: CKEDITOR.tools.objectKeys(removed)
            };
        },
        /**
         * Determines whether an element should have a "Display Text" field in the Link dialog.
         *
         * @since 4.5.11
         * @param {CKEDITOR.dom.element/null} element Selected element, `null` if none selected or if a ranged selection
         * is made.
         * @param {CKEDITOR.editor} editor The editor instance for which the check is performed.
         * @returns {Boolean}
         */
        showDisplayTextForElement: function (element, editor) {
            var undesiredElements = {
                img: 1,
                table: 1,
                tbody: 1,
                thead: 1,
                tfoot: 1,
                input: 1,
                select: 1,
                textarea: 1
            };

            // Widget duck typing, we don't want to show display text for widgets.
            if (editor.widgets && editor.widgets.focused) {
                return false;
            }

            return !element || !element.getName || !element.is(undesiredElements);
        }
    };

})();
