from flask import Flask, request, jsonify, make_response
import requests
import cv2
import pyzbar.pyzbar as pyzbar
import time
import os
import json

app = Flask(__name__)

@app.route('/decode', methods=["POST"])
def decode():
    json_request = request.get_json()
    usage_error = get_usage_error({"url": str}, json_request)
    print(json_request)
    if usage_error is not None:
        print(usage_error)
        return usage_error
    
    url = json_request['url']
    file = "qr.jpg"
    store_img_from_url(url, file)
    text = get_text_from_qr(file)
    if text is None:
        text = ""
    
    resp = make_response({"url": url, "text": text}, 200)
    return resp

def get_usage_error(keysToValueTypes, json_request):
    for key in keysToValueTypes:
        if key not in json_request:
            return make_response({"error": "usage error", "code": 1, "message": f"Request body must contain key \'{key}\'."}, 400)
        elif type(json_request[key]) is not keysToValueTypes[key]:
            return make_response({"error": "usage error", "code": 2, "message": f"Value type of \'context\' must be {keysToValueTypes[key]}."}, 400)
    return None


def store_img_from_url(url, file):
    with open(file, 'wb') as handle:
        img_response = requests.get(url, stream=True)

        if not img_response.ok:
            print(img_response)

        for block in img_response.iter_content(1024):
            if not block:
                break

            handle.write(block)

def get_text_from_qr(file_name):
    try:
        # read the QRCODE image
        img = cv2.imread(file_name)

        # not using cv2 for QR code, because it is bad
        # initialize the cv2 QRCode detector
        # detector = cv2.QRCodeDetector()

        # detect and decode
        # data, bbox, straight_qrcode = detector.detectAndDecode(img)

        # if bbox is not None:
        #     return data
        # else:
        #     return None

        # use pyzbar instead
        decodedObjects = pyzbar.decode(img)

        # assume the first QR code is the one we are looking for
        
        for obj in decodedObjects:
            if obj.type == "QRCODE":
                return bytes.decode(obj.data)
        return None

        
    except Exception as e:
        return None