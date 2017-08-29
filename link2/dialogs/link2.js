/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or http://ckeditor.com/license
 */

'use strict';

(function () {

    CKEDITOR.dialog.add('link2Dialog', function (editor) {

        var plugin = CKEDITOR.plugins.link2, initialLinkText, commonLang = editor.lang.common, linkLang = editor.lang.link2,
            urlRegex = /^((?:http|https|ftp|news):\/\/)?(.*)$/, urlMatch;

        return {
            title: linkLang.title,
            minWidth: ( CKEDITOR.skinName || editor.config.skin ) == 'moono-lisa' ? 400 : 300,
            minHeight: 160,
            /*--content--*/
            contents: [{
                id: 'info',
                label: linkLang.info,
                title: linkLang.info,
                /*--elements--*/
                elements: [{
                    type: 'text',
                    id: 'url',
                    label: commonLang.url,
                    required: true,
                    onLoad: function () {
                        this.allowOnChange = true;
                    },
                    validate: function () {
                        var Regx = /^(http|https|ftp|news):\/\/(?=.)/i;
                        if (!Regx.test(this.getValue())) {
                            alert(commonLang.invalidValue);
                            return false;
                        }
                        return true;
                    },
                    setup: function (data) {
                        this.allowOnChange = false;
                        if (data.url)
                            this.setValue(data.url);
                        this.allowOnChange = true;
                        //console.log(data);
                    },
                    commit: function (data) {
                        if (!data) {
                            data = {}
                        }
                        data.target = '_blank';
                        data.url = this.isEnabled() ? this.getValue() : '';
                        if (urlMatch = data.url.match(urlRegex)) {
                            data.protocol = urlMatch[1];
                        } else {
                            data.protocol = null;
                        }
                        this.allowOnChange = false;
                    }
                },
                    {
                        type: 'text',
                        id: 'linkDisplayText',
                        label: linkLang.displayText,
                        setup: function () {
                            this.enable();

                            this.setValue(editor.getSelection().getSelectedText());

                            initialLinkText = this.getValue();
                        },
                        commit: function (data) {
                            data.linkText = this.isEnabled() ? this.getValue() : '';
                        }
                    }]
                /*!--elements--*/
            }],
            /*!--content--*/
            onShow: function () {
                //console.log(this);
                var editor = this.getParentEditor(),
                    selection = editor.getSelection(),
                    selectedElement = selection.getSelectedElement(),
                    displayTextField = this.getContentElement('info', 'linkDisplayText').getElement().getParent().getParent(),
                    element = null;
                // Fill in all the relevant fields if there's already one link selected.
                if (( element = plugin.getSelectedLink(editor) ) && element.hasAttribute('href')) {
                    // Don't change selection if some element is already selected.
                    // For example - don't destroy fake selection.
                    if (!selectedElement) {
                        selection.selectElement(element);
                        selectedElement = element;
                    }
                } else {
                    element = null;
                }

                // Here we'll decide whether or not we want to show Display Text field.
                if (plugin.showDisplayTextForElement(selectedElement, editor)) {
                    displayTextField.show();
                } else {
                    displayTextField.hide();
                }

                var data = plugin.parseLinkAttributes(editor, element);

                // Record down the selected element in the dialog.
                this._.selectedElement = element;

                this.setupContent(data);
            },
            onOk: function () {
                var data = {};
                this.commitContent(data);
                var selection = editor.getSelection(), attributes = plugin.getLinkAttributes(editor, data), bm, nestedLinks;
                if (!this._.selectedElement) {
                    var range = selection.getRanges()[0],
                        text;

                    // Use link URL as text with a collapsed cursor.
                    if (range.collapsed) {
                        // Short mailto link text view (#5736).
                        text = new CKEDITOR.dom.text(data.linkText, editor.document);
                        range.insertNode(text);
                        range.selectNodeContents(text);
                    } else if (initialLinkText !== data.linkText) {
                        text = new CKEDITOR.dom.text(data.linkText, editor.document);

                        // Shrink range to preserve block element.
                        range.shrink(CKEDITOR.SHRINK_TEXT);

                        // Use extractHtmlFromRange to remove markup within the selection. Also this method is a little
                        // smarter than range#deleteContents as it plays better e.g. with table cells.
                        editor.editable().extractHtmlFromRange(range);

                        range.insertNode(text);
                    }

                    // Editable links nested within current range should be removed, so that the link is applied to whole selection.
                    nestedLinks = range._find('a');

                    for (var i = 0; i < nestedLinks.length; i++) {
                        nestedLinks[i].remove(true);
                    }

                    // Apply style.
                    var style = new CKEDITOR.style({
                        element: 'a',
                        attributes: attributes.set
                    });

                    style.type = CKEDITOR.STYLE_INLINE; // need to override... dunno why.
                    style.applyToRange(range, editor);
                    range.select();
                } else {
                    // We're only editing an existing link, so just overwrite the attributes.
                    var element = this._.selectedElement,
                        href = element.data('cke-saved-href'),
                        textView = element.getHtml(),
                        newText;

                    element.setAttributes(attributes.set);
                    element.removeAttributes(attributes.removed);

                    if (data.linkText && initialLinkText != data.linkText) {
                        // Display text has been changed.
                        newText = data.linkText;
                    }

                    if (newText) {
                        element.setText(newText);
                        // We changed the content, so need to select it again.
                        selection.selectElement(element);
                    }

                    delete this._.selectedElement;
                }
            }
        };
    });

})();